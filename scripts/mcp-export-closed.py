import bpy,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
out=root/'artifacts/blender/export-v2'; out.mkdir(exist_ok=True)
stack={'bottom-bun':(0,0,0),'egg':(0,0,.017),'tomato':(-.022,-.022,.024),'tomato-2':(.022,-.010,.026),'top-bun':(0,0,.033)}
spread={'bottom-bun':(0,0,0),'egg':(0,0,.063),'tomato':(-.024,-.008,.123),'tomato-2':(.024,.008,.135),'top-bun':(0,0,.194)}
for obj in bpy.context.scene.objects:
    if obj.type=='MESH': obj.hide_set(obj.name not in stack); obj.hide_render=obj.name not in stack
for name in stack:
    obj=bpy.data.objects[name]; obj.animation_data_clear(); obj.location=(0,0,0)
    if name.startswith('tomato'):
        for mat in obj.data.materials: mat.name='tomato-scanned'
    obj['assembled_position']=list(stack[name]); obj['exploded_position']=list(spread[name])
    obj['ingredient']=name.replace('tomato-2','tomato')
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True)
    bpy.context.view_layer.update()
    bpy.ops.export_scene.gltf(filepath=str(out/(name+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_image_format='AUTO',export_jpeg_quality=90)
bpy.ops.object.select_all(action='DESELECT')
for name in stack:
    obj=bpy.data.objects[name]; obj.location=stack[name]; obj.select_set(True)
bpy.context.view_layer.update()
bpy.ops.export_scene.gltf(filepath=str(out/'assembly.glb'),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_image_format='AUTO',export_jpeg_quality=90)
for name in stack:
    obj=bpy.data.objects[name]
    obj.location=stack[name]; obj.keyframe_insert(data_path='location',frame=1)
    obj.location=spread[name]; obj.keyframe_insert(data_path='location',frame=31)
bpy.context.scene.frame_start=1; bpy.context.scene.frame_end=31; bpy.context.scene.frame_set(31)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(root/'artifacts/blender/menu-ingredientes-cerrados.blend'))
print('Exported closed five-part burger and two tomato slices.')
