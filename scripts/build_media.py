"""Create responsive product covers and one thumbnail atlas per product.
No crop or generative changes; originals remain the source for zoom/details.
Run with Pillow. All paths are repository-relative.
"""
from pathlib import Path
from PIL import Image, ImageOps
import json
root = Path(__file__).resolve().parents[1]
out = root / 'assets/media'
out.mkdir(exist_ok=True)
report=[]
covers=json.loads((root/'scripts/media-covers.json').read_text())
for folder in sorted((root/'assets/products').iterdir()):
    if not folder.is_dir(): continue
    images=sorted(folder.glob('*.webp'))
    if not images: continue
    chosen=covers.get(folder.name,1)
    cover_path=(root/chosen) if isinstance(chosen,str) else folder/f'{chosen:02d}.webp'
    cover=Image.open(cover_path).convert('RGB')
    thumb=ImageOps.contain(cover,(400,400),Image.Resampling.LANCZOS)
    target=out/(folder.name+'-400.webp')
    thumb.save(target,'WEBP',quality=80,method=6)
    atlas=Image.new('RGB',(128*len(images),128),'#f5f2ed')
    for i,path in enumerate(images):
        frame=ImageOps.contain(Image.open(path).convert('RGB'),(128,128),Image.Resampling.LANCZOS)
        atlas.paste(frame,(128*i+(128-frame.width)//2,(128-frame.height)//2))
    atlas_path=out/(folder.name+'-thumbs.webp')
    atlas.save(atlas_path,'WEBP',quality=76,method=6)
    report.append({'id':folder.name,'coverSource':'/'+str(cover_path.relative_to(root)),'galleryCount':len(images),'sourceCoverBytes':cover_path.stat().st_size,'coverBytes':target.stat().st_size,'atlasBytes':atlas_path.stat().st_size})
source=Image.open(root/'assets/cat-bep.webp').convert('RGB')
for size in (400,800):
    ImageOps.contain(source,(size,size),Image.Resampling.LANCZOS).save(out/('home-'+str(size)+'.webp'),'WEBP',quality=82,method=6)
(out/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Covers:',len(report),'source:',sum(x['sourceCoverBytes'] for x in report),'optimized:',sum(x['coverBytes'] for x in report),'bytes')
print('Thumbnail atlases:',sum(x['atlasBytes'] for x in report),'bytes for',sum(x['galleryCount'] for x in report),'images')
