import bpy, bmesh, json, numpy as np
from pathlib import Path
root = Path(__file__).resolve().parents[1]
report = json.loads((root/'artifacts/blender/scan-report.json').read_text())
# Outlines traced against the orthographic inspection renders (640 x 640).
outlines = {
 'Pan_Inferior': [(49,320),(85,253),(112,182),(146,125),(194,89),(255,73),(355,73),(430,100),(497,156),(549,232),(573,300),(579,373),(559,447),(514,509),(457,550),(388,575),(334,585),(260,570),(181,536),(113,492),(69,443),(47,382)],
 'Pan_Superior': [(62,300),(68,244),(89,188),(128,142),(185,102),(238,70),(309,53),(377,51),(435,74),(484,112),(529,162),(561,191),(578,218),(578,406),(561,452),(529,489),(477,525),(414,561),(368,589),(244,590),(186,557),(139,510),(99,454),(71,395),(62,339)],
 'Huevo': [(133,369),(160,285),(203,226),(277,186),(336,151),(372,154),(402,120),(437,125),(476,158),(516,212),(548,267),(560,302),(574,338),(567,391),(545,443),(515,488),(470,532),(418,561),(354,584),(288,588),(232,571),(195,548),(158,511),(137,468),(127,420)],
 'Tomate': [(240,162),(247,123),(265,92),(295,65),(328,53),(370,49),(405,55),(436,77),(461,101),(480,132),(487,163),(485,203),(471,238),(448,259),(416,274),(378,281),(340,276),(300,262),(270,239),(249,208),(240,181)],
}
def inside(x,y,poly):
    yes=False
    for i in range(len(poly)):
        ax,ay=poly[i-1]; bx,by=poly[i]
        if (ay>y)!=(by>y) and x < (bx-ax)*(y-ay)/(by-ay)+ax: yes=not yes
    return yes

results={}
for name in report:
    obj=bpy.data.objects.get(name)
    if obj is None: continue
    bm=bmesh.new(); bm.from_mesh(obj.data); bm.normal_update()
    raw=len(bm.faces)
    if name in outlines:
        size=max(np.array(report[name]['max'])-np.array(report[name]['min']))*1.15
        poly=[((x-320)*size/640,(320-y)*size/640) for x,y in outlines[name]]
        def in_outline(v): return inside(v.x,v.y,poly)
        remove=[]
        for f in bm.faces:
            c=f.calc_center_median()
            if not in_outline(c) or f.normal.z < (-.1 if name=='Tomate' else -.45):
                remove.append(f)
        bmesh.ops.delete(bm,geom=remove,context='FACES')
        results[name]={'crop':'traced food silhouette; underside removed'}
    else:
        bottom=report[name]['min'][2]
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=(0,0,bottom+.008),plane_no=(0,0,1),clear_inner=True,clear_outer=False)
        results[name]={}
    # Keep only the food's largest connected shell, dropping floaters and scraps.
    remaining=set(bm.verts); components=[]
    while remaining:
        seed=remaining.pop(); stack=[seed]; comp=[seed]
        while stack:
            current=stack.pop()
            for edge in current.link_edges:
                v=edge.other_vert(current)
                if v in remaining:
                    remaining.remove(v); comp.append(v); stack.append(v)
        components.append(comp)
    components.sort(key=len,reverse=True)
    discard=[v for component in components[1:] for v in component]
    if discard: bmesh.ops.delete(bm,geom=discard,context='VERTS')
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(obj.data); bm.free(); obj.data.update()
    for mat in obj.data.materials:
        for node in mat.node_tree.nodes:
            if node.type=='BSDF_PRINCIPLED':
                node.inputs['Roughness'].default_value=.85
                node.inputs['Metallic'].default_value=0
                for link in list(mat.node_tree.links):
                    if link.to_socket==node.inputs['Normal']: mat.node_tree.links.remove(link)
    results[name].update({'originalFaces':raw,'cleanFaces':len(obj.data.polygons),'minZ':min(v.co.z for v in obj.data.vertices),'maxZ':max(v.co.z for v in obj.data.vertices)})
bpy.ops.wm.save_as_mainfile(filepath=str(root/'artifacts/blender/clean-stage.blend'))
(root/'artifacts/blender/clean-report.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results))

