import bpy,bmesh,math,json
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
out=root/'artifacts/reference-audit';out.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(root/'artifacts/blender/menu-before-closed.blend'))
o=bpy.data.objects['burger'];o.location=(0,0,0);o.animation_data_clear()
for obj in bpy.context.scene.objects:
    if obj.type=='MESH':obj.hide_render=obj!=o
o.hide_set(False)
m=o.data;bm=bmesh.new();bm.from_mesh(m)
print('bounds',[[min(v.co[i] for v in m.vertices),max(v.co[i] for v in m.vertices)] for i in range(3)])
print('open',sum(e.is_boundary for e in bm.edges),'nonmanifold',sum(not e.is_manifold for e in bm.edges))
bm.free()
print('materials',[(mat.name,[(n.image.name,list(n.image.size)) for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image]) for mat in m.materials])
for mat in m.materials:
    nt=mat.node_tree;tex=next(n for n in nt.nodes if n.type=='TEX_IMAGE' and n.image and 'diffuse' in n.image.name)
    output=next(n for n in nt.nodes if n.type=='OUTPUT_MATERIAL');emit=nt.nodes.new('ShaderNodeEmission')
    nt.links.new(tex.outputs['Color'],emit.inputs['Color']);nt.links.new(emit.outputs[0],output.inputs['Surface'])
camdata=bpy.data.cameras.new('Reference');cam=bpy.data.objects.new('Reference',camdata);bpy.context.scene.collection.objects.link(cam)
scene=bpy.context.scene;scene.camera=cam;camdata.type='ORTHO';camdata.ortho_scale=.14
scene.render.engine='CYCLES';scene.cycles.samples=4;scene.render.resolution_x=900;scene.render.resolution_y=600;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard';scene.render.image_settings.file_format='PNG'
for degrees in [0,90,180,270]:
    a=math.radians(degrees);center=Vector((0,0,.03));cam.location=center+Vector((math.cos(a)*.3,math.sin(a)*.3,0))
    cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(out/f'reference-{degrees}.png');bpy.ops.render.render(write_still=True)
print('Reference orthographic views saved')
