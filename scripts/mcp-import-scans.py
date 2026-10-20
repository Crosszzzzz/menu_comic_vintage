import bpy, json, zipfile
from pathlib import Path
from mathutils import Vector
root = Path(__file__).resolve().parents[1]
for archive in (root/'public/models').glob('*.zip'):
    folder=root/'artifacts/blender/source'/archive.stem
    folder.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(archive) as source:
        for entry in source.infolist():
            if not entry.is_dir():
                (folder/Path(entry.filename).name).write_bytes(source.read(entry))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
report = {}
scan_report = {}
for folder in sorted((root/'artifacts/blender/source').iterdir()):
    bpy.ops.wm.obj_import(filepath=str(next(folder.glob('*.obj'))))
    obj = bpy.context.selected_objects[0]
    obj.name = folder.name
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    scan_report[obj.name]={'min':[min(v.co[i] for v in obj.data.vertices) for i in range(3)],'max':[max(v.co[i] for v in obj.data.vertices) for i in range(3)],'vertices':len(obj.data.vertices),'faces':len(obj.data.polygons)}
    bins = {}
    for f in obj.data.polygons:
        if f.normal.z > .85:
            z = round(f.center.z, 3)
            bins[z] = bins.get(z,0)+f.area
    report[obj.name] = sorted(bins.items(),key=lambda p:p[1],reverse=True)[:10]
bpy.ops.wm.save_as_mainfile(filepath=str(root/'artifacts/blender/scans-working.blend'))
(root/'artifacts/blender/scan-report.json').write_text(json.dumps(scan_report,indent=2))
print(json.dumps(report))
