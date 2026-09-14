"""Baseball garments and sculpted hair. World-meter geometry, FBX-safe binding."""
import math
import bpy
import common as C

def material(role, color):
    return C.flat_material(role, rgba=color)

def loft(name, rings, mat, n=24):
    verts=[(x+rx*math.cos(a*math.tau/n),y+ry*math.sin(a*math.tau/n),z)
           for x,y,z,rx,ry in rings for a in range(n)]
    faces=[(r*n+a,r*n+(a+1)%n,(r+1)*n+(a+1)%n,(r+1)*n+a)
           for r in range(len(rings)-1) for a in range(n)]
    faces += [tuple(reversed(range(n))),tuple(range((len(rings)-1)*n,len(rings)*n))]
    o=C.new_mesh_from_pydata(name,verts,faces,material=mat)
    for p in o.data.polygons: p.use_smooth=True
    return o

def strand(name, points, widths, mat):
    return loft(name,[(x,y,z,w,w*.4) for (x,y,z),w in zip(points,widths)],mat,12)

def bind(o, arm, body, bone=None):
    world=o.matrix_world.copy(); o.parent=arm; o.matrix_world=world
    if bone:
        group=o.vertex_groups.new(name=bone)
        group.add(list(range(len(o.data.vertices))),1.,'REPLACE')
    else:
        # Garments need anatomical weights, not nearest donor costume weights.
        for v in o.data.vertices:
            p=o.matrix_world @ v.co
            if 'pants' in o.name:
                side='L' if p.x>0 else 'R'
                t=max(0,min(1,(p.z-.48)/.15))
                weights={'thigh.'+side:t,'shin.'+side:1-t}
            elif 'sleeve' in o.name or 'cuff' in o.name:
                weights={'upper_arm.'+('L' if p.x>0 else 'R'):1}
            else:
                t=max(0,min(1,(p.z-1.12)/.24))
                weights={'hips':1-t,'chest':t}
            for name,w in weights.items():
                if w>0:
                    g=o.vertex_groups.get(name) or o.vertex_groups.new(name=name)
                    g.add([v.index],w,'REPLACE')
    o.modifiers.new('Deform','ARMATURE').object=arm
    for p in o.data.polygons: p.use_smooth=True
    return o

def delete_maid_dress(mesh_obj):
    """Alias used by build_vroid's extra-mesh sweep."""
    return remove_costume(mesh_obj)


def remove_costume(body):
    me=body.data
    remove={i for i,m in enumerate(me.materials) if m and any(k in m.name.lower() for k in ('cloth','shoes','hair'))}
    bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); bpy.context.view_layer.objects.active=body
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT'); bpy.ops.object.mode_set(mode='OBJECT')
    count=0
    for p in me.polygons:
        center=body.matrix_world @ p.center
        covered=center.z<1.1 or (center.z<1.47 and abs(center.x)<.34)
        p.select=p.material_index in remove or covered
        count+=int(p.select)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.delete(type='FACE')
    bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.delete_loose(); bpy.ops.object.mode_set(mode='OBJECT')
    return count

# Jersey back profile (z -> (rx, ry)) sampled from the kit_jersey loft rings,
# used to wrap the back number onto the cloth instead of floating it flat.
_JERSEY_RINGS=[(1.00,.165,.115),(1.055,.162,.112),(1.15,.158,.107),(1.25,.172,.127),(1.36,.181,.126),(1.43,.195,.094)]

def _jersey_radii(z):
    r=_JERSEY_RINGS
    if z<=r[0][0]: return r[0][1],r[0][2]
    for (z0,rx0,ry0),(z1,rx1,ry1) in zip(r,r[1:]):
        if z0<=z<=z1:
            t=(z-z0)/(z1-z0); return rx0+(rx1-rx0)*t,ry0+(ry1-ry0)*t
    return r[-1][1],r[-1][2]

def block_one(mat):
    """Bold varsity '1' for Aoi's back: stem, flag and base as boxes, then
    wrapped onto the jersey back. The font digit was a hairline stroke that
    vanished at phone width; this is the mark the catcher camera names her by."""
    stem=C.new_box('kit_number_back',(.085,.012,.27),location=(0,.141,1.245),material=mat)
    flag=C.new_box('num_flag',(.078,.012,.06),location=(.060,.141,1.338),material=mat,rotation=(0,.62,0))
    base=C.new_box('num_base',(.19,.012,.05),location=(0,.141,1.135),material=mat)
    o=C.join_objects([stem,flag,base],'kit_number_back')
    inv=o.matrix_world.inverted()
    for v in o.data.vertices:
        w=o.matrix_world @ v.co
        rx,ry=_jersey_radii(w.z)
        surf=.012+ry*math.sqrt(max(0.,1.-(w.x/rx)**2))
        w.y=surf+(w.y-.141)+.006
        v.co=inv @ w
    for p in o.data.polygons: p.use_smooth=False
    return o

def build_kit(arm,body,variant):
    removed=remove_costume(body); aoi=variant=='aoi'; parts=[]
    cream=material('kit_cream',(.89,.86,.77,1)); navy=material('kit_navy',(.022,.038,.082,1))
    accent=material('kit_accent',(.86,.18,.28,1) if aoi else (.29,.67,.86,1))
    gold=material('kit_gold',(.88,.59,.17,1))
    hair=material('hair_sculpt',(.16,.065,.029,1) if aoi else (.57,.63,.72,1))
    highlight=material('hair_ribbon',(.29,.13,.058,1) if aoi else (.78,.82,.88,1))
    def add(o,bone=None):
        parts.append(bind(o,arm,body,bone)); return o
    add(loft('kit_jersey',[(0,.012,1.00,.165,.115),(0,.012,1.055,.162,.112),
        (0,.009,1.15,.158,.107),(0,0,1.25,.172,.127),(0,.002,1.36,.181,.126),
        (0,.012,1.43,.195,.094),(0,.012,1.47,.157,.082),(0,.012,1.495,.061,.063)],cream if aoi else navy))
    add(loft('kit_collar',[(0,.008,1.482,.069,.067),(0,.008,1.502,.063,.061)],accent),'chest')
    if aoi:  # LOOK: coral + gold piping. A thin gold band under the collar reads from behind; the buttons do not.
        add(loft('kit_collar_gold',[(0,.008,1.468,.073,.071),(0,.008,1.482,.070,.068)],gold),'chest')
    add(loft('kit_belt',[(0,.012,1.04,.167,.116),(0,.012,1.067,.166,.116)],navy))
    for side,sgn in [('L',1),('R',-1)]:
        add(loft('kit_pants_'+side,[(sgn*.087,.006,1.065,.088,.115),(sgn*.087,.004,.91,.091,.112),
            (sgn*.084,.006,.78,.085,.1),(sgn*.079,.01,.64,.074,.083),(sgn*.074,.005,.54,.066,.071)],navy))
        add(loft('kit_sock_'+side,[(sgn*.074,0,.10,.044,.052),(sgn*.074,0,.28,.052,.056),(sgn*.074,0,.50,.058,.062)],navy),'shin.'+side)
        add(loft('kit_sock_stripe_'+side,[(sgn*.074,0,.215,.0505,.0555),(sgn*.074,0,.234,.0505,.0555)],accent),'shin.'+side)
        sleeve=loft('kit_sleeve_'+side,[(0,0,0,.078,.078),(0,0,.10,.073,.073),(0,0,.18,.062,.062)],navy if aoi else cream)
        for v in sleeve.data.vertices:
            x,y,z=v.co; v.co=(sgn*(.155+z),y+.013,1.431+x)
        add(sleeve)
        cuff=loft('kit_cuff_'+side,[(0,0,0,.064,.064),(0,0,.014,.064,.064)],accent)
        for v in cuff.data.vertices:
            x,y,z=v.co; v.co=(sgn*(.32+z),y+.013,1.431+x)
        add(cuff)
        shoe=C.new_sphere('kit_cleat_'+side,.1,location=(sgn*.076,-.025,.06),segments=20,rings=10,material=navy)
        for v in shoe.data.vertices: v.co.x*=.60; v.co.y*=1.45; v.co.z*=.55
        add(shoe,'foot.'+side)
        add(C.new_box('kit_sole_'+side,(.12,.25,.02),location=(sgn*.076,-.035,.018),material=cream),'foot.'+side)
    add(C.new_box('kit_placket',(.012,.008,.30),location=(0,-.124,1.28),material=accent))
    for i in range(4):
        add(C.new_sphere('kit_button_'+str(i),.005,location=(0,-.13,1.13+i*.073),segments=8,rings=4,material=gold))
    for back in [False,True]:
        if back and aoi:
            add(block_one(navy),'chest'); continue
        curve=bpy.data.curves.new('number','FONT'); curve.body='1' if aoi else '18'; curve.align_x='CENTER'
        # Back digit is the catcher-camera mark: larger and thicker so it reads at phone scale.
        curve.size=.24 if back else .07; curve.extrude=.006 if back else .0008
        o=bpy.data.objects.new('kit_number_back' if back else 'kit_number_front',curve); bpy.context.collection.objects.link(o)
        o.location=(0 if back else -.09,.138 if back else -.132,1.24 if back else 1.32)
        o.rotation_euler=(math.pi/2,0,math.pi if back else 0)
        bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active=o; o.select_set(True); bpy.ops.object.convert(target='MESH')
        o.data.materials.append(navy if aoi else cream); add(o,'chest')
    shell=loft('hair_crown',[(0,.036,1.59,.098,.075),(0,.039,1.68,.137,.102),
        (0,.027,1.77,.145,.114),(0,.02,1.822,.087,.073),(0,.02,1.842,.01,.012)],hair,32)
    for v in shell.data.vertices:
        if v.co.z<1.74 and v.co.y<.018: v.co.y=.018
    add(shell,'head')
    for i in range(7):
        x=(i-3)*.033; endz=1.683+.045*(1-abs(i-3)/3)
        add(strand('hair_fringe_'+str(i),[(x*.6,-.062,1.805),(x,-.096,1.756),(x*1.1,-.111,1.715),(x*1.18,-.10,endz)],
            [.029,.027,.018,.001],hair if i%3 else highlight),'head')
    for sgn in [-1,1]:
        add(strand('hair_temple_'+str(sgn),[(sgn*.115,-.025,1.78),(sgn*.137,-.05,1.68),(sgn*.129,-.046,1.58),(sgn*.116,-.03,1.52)],
            [.024,.023,.017,.001],hair),'head')
    if aoi:
        add(strand('hair_ponytail',[(0,.14,1.78),(.015,.22,1.75),(.035,.25,1.62),(.052,.245,1.46),(.09,.22,1.29)],
            [.035,.065,.060,.043,.001],hair),'head')
        add(strand('hair_pony_highlight',[(0,.19,1.77),(.025,.207,1.63),(.052,.21,1.46),(.085,.21,1.31)],
            [.018,.019,.013,.001],highlight),'head')
    else:
        for i in range(9):
            x=(i-4)*.033
            add(strand('hair_curtain_'+str(i),[(x*.75,.084,1.79),(x,.134,1.61),(x*1.18,.145,1.39),(x*1.13,.143,1.12),(x*1.03,.12,1.03+abs(i-4)*.014)],
                [.025,.031,.029,.023,.001],highlight if i%3==0 else hair),'head')
    add(loft('kit_cap',[(0,.025,1.77,.151,.129),(0,.027,1.80,.148,.127),(0,.034,1.845,.121,.11),
        (0,.035,1.869,.070,.067),(0,.035,1.878,.003,.003)],navy,32),'head')
    bill=C.new_sphere('kit_bill',1,location=(0,-.126,1.769),segments=24,rings=8,material=navy)
    for v in bill.data.vertices: v.co.x*=.151; v.co.y*=.114; v.co.z*=.009
    add(bill,'head')
    add(C.new_sphere('kit_cap_button',.012,location=(0,.035,1.88),segments=10,rings=6,material=accent),'head')
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]; bpy.ops.object.join()
    garment=bpy.context.object; garment.name='kit_'+variant
    bpy.ops.object.vertex_group_limit_total(limit=4); bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    return removed,[garment.name]
