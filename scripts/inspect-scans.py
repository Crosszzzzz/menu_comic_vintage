import bpy, math, json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/blender'
report = {}
for folder in sorted((OUT / 'source').iterdir()):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.wm.obj_import(filepath=str(next(folder.glob('*.obj'))))
    objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    points = [o.matrix_world @ v.co for o in objects for v in o.data.vertices]
    lo = Vector(tuple(min(v[i] for v in points) for i in range(3)))
    hi = Vector(tuple(max(v[i] for v in points) for i in range(3)))
    center = (lo + hi) / 2
    size = max(hi-lo)
    report[folder.name] = {'min':list(lo),'max':list(hi),'vertices':len(points),'faces':sum(len(o.data.polygons) for o in objects)}
    print(folder.name, report[folder.name], flush=True)
    for mat in bpy.data.materials:
        if not mat.use_nodes: continue
        tree = mat.node_tree
        tex = next((n for n in tree.nodes if n.type == 'TEX_IMAGE' and n.image and 'diffuse' in n.image.name), None)
        if tex:
            emit = tree.nodes.new('ShaderNodeEmission')
            tree.links.new(tex.outputs['Color'], emit.inputs['Color'])
            tree.links.new(emit.outputs[0], next(n for n in tree.nodes if n.type == 'OUTPUT_MATERIAL').inputs['Surface'])
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 8
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.world = bpy.data.worlds.new('World')
    scene.world.color = (0.15,0.15,0.15)
    scene.view_settings.view_transform = 'Standard'
    for label, direction in [('top',(0,0,1)),('front',(0,-1,0.3)),('side',(1,0,0.3)),('bottom',(0,0,-1))]:
        data = bpy.data.cameras.new(label)
        camera = bpy.data.objects.new(label,data)
        scene.collection.objects.link(camera)
        camera.location = center + Vector(direction).normalized()*size*2
        camera.rotation_euler = (center-camera.location).to_track_quat('-Z','Y').to_euler()
        data.type = 'ORTHO'
        data.ortho_scale = size*1.15
        scene.camera = camera
        scene.render.filepath = str(OUT / f'{folder.name}-{label}.png')
        bpy.ops.render.render(write_still=True)
(OUT/'scan-report.json').write_text(json.dumps(report,indent=2))
