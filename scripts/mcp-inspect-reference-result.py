import bpy,bmesh,json
for n in ['bottom-bun','egg','tomato-left','tomato-right','top-bun']:
 o=bpy.data.objects[n];b=bmesh.new();b.from_mesh(o.data)
 print(n,{str(i):sum(f.material_index==i for f in b.faces) for i in range(len(o.data.materials))})
 print('nonmanifold',[{'verts':[list(v.co) for v in e.verts],'faces':len(e.link_faces),'materials':[f.material_index for f in e.link_faces]} for e in b.edges if not e.is_manifold][:10])
 b.free()
