import bpy
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
scene=bpy.context.scene
scene.render.engine='CYCLES'; scene.cycles.samples=8
scene.render.resolution_x=640; scene.render.resolution_y=640
scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard'
if not scene.world: scene.world=bpy.data.worlds.new('World')
scene.world.color=(.15,.15,.15)
meshes=[o for o in scene.objects if o.type=='MESH']
saved=[]
for mat in bpy.data.materials:
    if not mat.use_nodes: continue
    tree=mat.node_tree
    tex=next((n for n in tree.nodes if n.type=='TEX_IMAGE' and n.image and 'diffuse' in n.image.name),None)
    out=next((n for n in tree.nodes if n.type=='OUTPUT_MATERIAL'),None)
    if tex and out:
        old=out.inputs['Surface'].links[0].from_socket
        emit=tree.nodes.new('ShaderNodeEmission')
        tree.links.new(tex.outputs['Color'],emit.inputs['Color'])
        tree.links.new(emit.outputs[0],out.inputs['Surface'])
        saved.append((tree,emit,out,old))
camera_data=bpy.data.cameras.new('QA camera'); camera=bpy.data.objects.new('QA camera',camera_data)
scene.collection.objects.link(camera); scene.camera=camera
camera_data.type='ORTHO'
for obj in meshes:
    for o in meshes: o.hide_render=o!=obj
    points=[obj.matrix_world@v.co for v in obj.data.vertices]
    lo=Vector([min(v[i] for v in points) for i in range(3)])
    hi=Vector([max(v[i] for v in points) for i in range(3)])
    center=(lo+hi)/2; size=max(hi-lo)
    camera_data.ortho_scale=size*1.15
    for label,direction in [('top',(0,0,1)),('front',(0,-1,.35)),('bottom',(0,0,-1))]:
        camera.location=center+Vector(direction).normalized()*size*2
        camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(root/'artifacts/blender'/f'clean-{obj.name}-{label}.png')
        bpy.ops.render.render(write_still=True)
for tree,emit,out,old in saved:
    tree.links.new(old,out.inputs['Surface']); tree.nodes.remove(emit)
for o in meshes: o.hide_render=False
bpy.data.objects.remove(camera,do_unlink=True)
print('Clean model inspection renders complete')
