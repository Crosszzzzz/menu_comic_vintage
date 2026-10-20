import bpy, json
for name in ['top-bun','bottom-bun','egg','tomato']:
    o=bpy.data.objects[name]
    print(name, 'vertices',len(o.data.vertices),'dimensions',list(o.dimensions))
    print('z', min(v.co.z for v in o.data.vertices), max(v.co.z for v in o.data.vertices))
    for m in o.data.materials:
        print(m.name,[(n.image.name,list(n.image.size)) for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image])
