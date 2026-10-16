import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function createStore(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS quotes (id TEXT PRIMARY KEY, expires INTEGER NOT NULL, body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, code INTEGER UNIQUE NOT NULL, idem TEXT UNIQUE NOT NULL, access TEXT NOT NULL, body TEXT NOT NULL, sheet_dirty INTEGER NOT NULL DEFAULT 1);
  `);
  const parse = row => row ? JSON.parse(row.body) : null;
  return {
    quote(id, body) {
      db.prepare('DELETE FROM quotes WHERE expires < ?').run(Date.now());
      db.prepare('INSERT INTO quotes VALUES (?, ?, ?)').run(id, body.expires, JSON.stringify(body));
    },
    getQuote: id => parse(db.prepare('SELECT body FROM quotes WHERE id=? AND expires>?').get(id, Date.now())),
    byId: id => parse(db.prepare('SELECT body FROM orders WHERE id=?').get(id)),
    byCode: code => parse(db.prepare('SELECT body FROM orders WHERE code=?').get(code)),
    byKey: idem => parse(db.prepare('SELECT body FROM orders WHERE idem=?').get(idem)),
    canRead: (id, access) => Boolean(db.prepare('SELECT id FROM orders WHERE id=? AND access=?').get(id, access)),
    create(order, idem, access) { db.prepare('INSERT INTO orders (id,code,idem,access,body) VALUES (?,?,?,?,?)').run(order.id, order.orderCode, idem, access, JSON.stringify(order)); },
    save(order) { db.prepare('UPDATE orders SET body=?,sheet_dirty=1 WHERE id=?').run(JSON.stringify(order), order.id); },
    dirty: () => db.prepare('SELECT body FROM orders WHERE sheet_dirty=1 LIMIT 20').all().map(parse),
    clean(order) { db.prepare('UPDATE orders SET sheet_dirty=0 WHERE id=? AND body=?').run(order.id, JSON.stringify(order)); },
    close: () => db.close()
  };
}
