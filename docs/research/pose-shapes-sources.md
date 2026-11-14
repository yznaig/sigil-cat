# Pose shapes: sources and technique notes
> Raw research notes (2026-11-08) for the Sigil Cat loaf/sleep/stretch pose shape keys.
> Method: yt-dlp captions (4 videos skimmed), Blender 4.5/5.x manual pages, web search. "[mem]" = from my own knowledge, not verified in a fetched source.

## 1. Corrective / pose shape keys from a sculpted or modifier-built pose
- What: Shape key = per-vertex offset from Basis, same vertex count/order. Any modifier stack result can be baked in with "Apply as Shape Key" (modifier dropdown -> Apply as Shape Key; or shape-key panel "New from Mix"). Standard recipe: duplicate mesh, deform/sculpt the copy, then store it on the rest mesh as a key (or Blend From Shape).
- Shrinkwrap -> shape key is a documented 3-step recipe: add Shrinkwrap targeting the new shape, "Apply as Shape Key", delete the target. Result is exactly the wrapped positions, so any lumps in the target are baked in; no smoothing happens implicitly.
- Failure modes: topology must not change (no remesh/decimate after keying; remesh ignores shape keys); a key made with a constructive modifier earlier in the stack needs a bind/rest copy; keys are linear vertex lerps, so mid-blend values (0.5) can shrink volume and pass through collapsed shapes when the end pose is far from rest (sit -> curled sleep rotates big parts).
- Fixes: author each key as an offset field that is smooth in space (smooth the displacement field, not only the final positions); keep large rotations in bones (skin pose) and use keys for the residual; add an intermediate key or a driver-weighted pair if mid-blend collapses.
- Corrective-key videos (bone-angle driven keys): they are about face/elbow correctives, only the "sculpt on a posed copy, store back" idea transfers.
- Sources:
  - Blender 5.1 Shape Keys Tutorial, Shrinkwrap Modifier to Shape Key | https://www.youtube.com/watch?v=TIKoh5nxPmc
  - Corrective Shape Keys, Blender 2.8 | https://www.youtube.com/watch?v=1WmFaBlDBHs
  - How to Create a Corrective Shape Using a Bone | https://www.youtube.com/watch?v=tqyVtOyl4kY
  - Blender manual, Retopology/remesh (remesh ignores shape keys) | https://docs.blender.org/manual/es/dev/modeling/meshes/retopology.html

## 2. Corrective Smooth / Delta Mush (smoothing the deformation, keeping detail)
- What: Blender "Smooth Corrective": smooths the deformed mesh, using the rest mesh to detect distorted areas. Delta Mush (Mancewicz, Derksen, Wilson, DigiPro 2014; Rhythm and Hues since 2010): Laplacian-smooth the rest mesh, store per-vertex delta (rest - smoothed) in a local tangent frame, smooth the deformed mesh the same way, re-apply the delta in the deformed frame. Smooths skinning artefacts while keeping sculpt detail.
- Blender params (manual + videos): Factor (strength; outside 0-1 distorts), Repeat (iterations; artists use 5-15, factor 0.5), Scale (compensates volume loss), Smooth Type Simple vs Length Weight (length weight preserves form better), Only Smooth (previews plain smoothing), Pin Boundaries, Vertex Group, Rest Source = Original Coordinates (same vertex count) or Bind Coordinates (needed if Subdivision/Mirror precede it).
- Failure modes: volume loss/shrink (esp. thin parts: tail tube, paws); too many repeats moves the mesh too much; Blender modifier is NOT exported to glTF (bake result to a shape key first); original Delta Mush mishandles non-rigid/scale transforms (see Enhanced Direct Delta Mush, 2021); smoothing also rounds intentionally sharp features.
- Fixes: use as a bake step (apply as shape key after smoothing), Scale >1 slightly or Preserve Volume to offset shrink, Length Weight, vertex-group mask so head/ears stay rigid, keep Factor ~0.5 and tune Repeat.
- Fit: the "delta" idea is useful in reverse for us: smooth the cat's rest-to-target displacement field, add it back; see section 4.
- Sources:
  - Blender manual, Smooth Corrective modifier | https://docs.blender.org/manual/en/4.5/modeling/modifiers/deform/corrective_smooth.html
  - Smooth Corrective: Blender's "Magic" modifier (video) | https://www.youtube.com/watch?v=Ydo6DWXSuvw
  - Corrective Smooth Modifier, Fix Rig Deformations (video) | https://www.youtube.com/watch?v=w7Lsn7J8tGM
  - Delta Mush: Smoothing Deformations While Preserving Detail (DigiPro 2014) | https://dblp.uni-trier.de/rec/conf/digipro/MancewiczDRW14.html (paper via https://unpaywall.org/10.1145%2F2633374.2633376)
  - Maya Delta Mush deformer docs | https://help.autodesk.com/cloudhelp/ENU/MayaCRE-CharacterAnimation/files/GUID-139B703C-28E7-4787-8FD4-C2991BD6C990.htm
  - Enhanced Direct Delta Mush (2021) | https://arxiv.org/pdf/2101.02798
  - Blender manual, Smooth Laplacian modifier (Preserve Volume, Lambda Border, >10k verts is slow) | https://docs.blender.org/manual/en/4.5/modeling/modifiers/deform/laplacian_smooth.html

## 3. Surface Deform / mesh-deform cage transfer
- What: Surface Deform binds each vertex of the modified mesh to the nearest face(s) of a target mesh and follows later changes of that target. Typical use: transfer shape keys from body to clothes (bind, set key, "Apply as Shape Key", unbind). Whole-mesh, so it is a cage-style transfer: the cat follows a proxy that moves from sit to loaf.
- Constraints on the target mesh (manual): no edges with >2 faces, no concave faces, no doubles, no faces with collinear edges, or the bind fails. Binding is by global coordinates; object transforms after bind are ignored.
- Failure modes: "the further a mesh deviates from the target surface the more likely artefacts" (manual); loose/baggy parts bind to far faces and move wrong (video: baggy shirt); strongly exaggerated moves perform differently; lower Interpolation Falloff = smoother but slight artefacts.
- Fixes: bind a proxy that already roughly overlaps the cat (a low-poly cage/proxy of the same blockout in the sit pose), deform the proxy to each pose, apply as key; Falloff tuning; Strength via vertex group; scripts can loop over keys (video 75STi2o7VjA shows this).
- Related: Mesh Deform cage (Blender), Lattice, Laplacian Deform modifier (anchor + move groups, solves a Laplacian system with positional constraints) are alternative cages.
- Sources:
  - Blender manual, Surface Deform modifier | https://docs.blender.org/manual/en/4.5/modeling/modifiers/deform/surface_deform.html
  - Copy shapekeys from character to clothes [Surface Deform] (video) | https://www.youtube.com/watch?v=75STi2o7VjA
  - How to Use the SURFACE DEFORM Modifier (video, not read) | https://www.youtube.com/watch?v=3tYqf2bmOUI

## 4. Shrinkwrap pitfalls and even-topology fixes
- What: Shrinkwrap moves each vertex independently to the target. Modes: Nearest Surface Point; Project (along axis/normal, with Limit, Subdivision Levels, face culling, Auxiliary Target); Nearest Vertex; Target Normal Project ("much smoother projection ... significantly slower", searches for the point whose smooth normal points at the vertex). Snap modes On/Above/Outside/Inside Surface + Offset (Above Surface uses smooth normal).
- Failure modes: vertices cluster on convex/high-curvature target regions and stretch across concavities, producing thin triangles, folds and uneven spacing (nearest-point has no per-vertex regularity); thin/long triangles are spatially unstable; vertices that miss in Project mode stay put (tearing); flipped normals; nearest point can jump across a crease between two primitives (visible seam).
- Fixes (community, not official): (a) smooth-then-shrinkwrap on a duplicate, apply in that order; (b) shrinkwrap in small steps with a Smooth/Corrective Smooth/Laplacian pass between ("relax while projecting"): loop { Laplacian/tangential smoothing step; reproject to target }, 5-30 iterations; (c) use Target Normal Project instead of Nearest; (d) Project mode along per-region axes with Subdivision Levels; (e) offset 0 with "Above Surface" snap; (f) extra loop cuts where the shape changes.
- Even-topology principle: constrain smoothing to the tangent plane (move vertices only along the surface, then snap back), the standard trick behind remeshers (tangential relaxation + reprojection). Laplacian mesh editing (Sorkine 2004; Lipman 2005) keeps local detail/spacing by solving a sparse system with positional constraints; Blender's Laplacian Deform modifier is the nearest built-in.
- [mem] A pure-numpy variant: displacement field d_i = target_i - rest_i; solve L d' = L d with soft anchors (head vertices pinned at zero), or just iterate d <- avg of neighbours (Jacobi) a few times to low-pass the field; apply positions + d'. This is a "delta" smoothing: smooths shape change, preserves the cat's own surface detail.
- Sources:
  - Blender manual, Shrinkwrap modifier | https://docs.blender.org/manual/en/4.5/modeling/modifiers/deform/shrinkwrap.html
  - Smooth with shrink wrap, re-topo related (Blender Artists) | https://blenderartists.org/t/smooth-with-shrink-wrap-re-topo-related/1350408
  - Part of mesh starts to stretch extremely, shrinkwrap (Blender Artists) | https://blenderartists.org/t/part-of-mesh-starts-to-stretch-extremely-possibly-because-of-shrinkwrap-modifier/1581745
  - How to distribute faces/edges evenly over a finished model | https://blenderartists.org/t/how-to-distribute-faces-edges-evenly-over-a-finished-model/561105
  - Laplacian Mesh Editing (tutorial, Ctralie) | https://ctralie.com/Teaching/LapMesh
  - Laplacian Surface Editing slides/paper (Sorkine) | https://hongbofu.people.ust.hk/doc/laplacian_sgp.pdf
  - Linear rotation-invariant coordinates for meshes (Lipman et al. 2005) | https://history.siggraph.org/?p=113874

## 5. Primitive blockouts: SDF smooth union, metaballs, Volume to Mesh
- Smooth min (Inigo Quilez): [mem formulas] quadratic polynomial: h = max(k-|a-b|,0)/k; smin = min(a,b) - h*h*k/4 (C1, k = blend band width, fast, order dependent). Cubic: h*h*h*k/6 (C2, smoother). Exponential: smin = -k*log2(2^(-a/k) + 2^(-b/k)) (generalises to N inputs, order independent, global influence). Power/circular variants exist. Per search summary: IQ's newer article frames them as a kernel g(x); Media Molecule used the polynomial smin in Dreams (credited to Dave Smith).
- Failure modes: smin pulls the surface slightly outward at the junction (adds volume; shrink radii or k to compensate); distances are no longer exact SDFs near blends (fine for meshing, bad for offset/shell ops); polynomial smin depends on blend order for 3+ shapes; ellipsoid SDFs are approximate (bound-based), so stretch primitives with the iq ellipsoid approximation or build from capsules/spheres.
- Meshing: skimage.measure.marching_cubes on a sampled grid; resolution (voxel << paw radius) matters for smooth normals; Blender: Mesh to SDF Grid -> SDF Grid Boolean (Union = hard min per docs, no smooth radius; verify) -> Grid to Mesh / Volume to Mesh modifier (threshold = iso value; only scalar grids). Smooth union in GN would need a custom formula on grids; numpy is easier.
- Metaballs (Blender): smooth blend of spheres/ellipsoids/capsules with threshold + resolution; converting to mesh then remesh; artists report metaball editing gets fiddly (one report: selecting one element grabs neighbours, instructor advised ordinary primitives). Blender manual: auto remesh seldom yields deformation-ready topology, which is why we wrap our own mesh onto the blob instead of using the blob itself.
- Tools built on smooth-unioned primitives: Dreams (Media Molecule; started as a sculpting tool), Womp (browser "goop" blend/carve, parametric), MagicaCSG (SDF editor by MagicaVoxel author; forum calls it suited to base meshes and cartoony toy characters), Clayxels (Unity/engine primitive clay; little info found), Substance Modeler (not researched). Forum comments: SDF tools fine for blockouts, fine organic detail needs curves with variable radius; output is always converted to polygons.
- Sources:
  - Smooth Minimum article (Inigo Quilez) | https://iquilezles.org/articles/smin (fetch returned 404 for the trailing-slash form; article exists per search)
  - Polynomial Smooth Minimum (derivation) | https://ianstranathan.github.io/html/Graphics/polynomial-smin
  - glsl-smooth-min (poly/pow/exp, k = band size) | https://github.com/glslify/glsl-smooth-min
  - Blender manual, SDF Grid Boolean node | https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/volume/operations/sdf_grid_boolean.html
  - Blender manual, Mesh to SDF Grid node | https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/mesh/operations/mesh_to_sdf_grid.html
  - Blender manual, Volume to Mesh modifier | https://docs.blender.org/manual/en/4.3/modeling/modifiers/generate/volume_to_mesh.html
  - Fancy SDF Operations, Houdini (smooth min) | https://www.youtube.com/watch?v=xPrnFhfuuk4
  - The big MagicaCSG and SDF modeling thread | https://blenderartists.org/t/the-big-magicacsg-and-sdf-modeling-thread/1293075
  - Womp Liquid 3D | https://www.womp.com/blogs/explore-womps-unique-liquid-3d-modeling-allowing-you-to-melt-blend-and-deform-shapes-effortlessly-in-your-browser-discover-how-to-create-stunning-organic-3d-designs-and-bring-them-to-life-with-our-integrated-3d-printing-service
  - Media Molecule, Learning from Failure (Alex Evans, Umbra Ignite 2015) | https://www.mediamolecule.com/blog/article/alex_at_umbra_ignite_2015_learning_from_failure_video
  - Metaball pain report (Ulster blog) | https://blogs.ulster.ac.uk/neavethompson/?p=454

## 6. Chibi / vinyl-toy silhouette notes
- Search found no technical article on pinch avoidance or volume preservation for toys; only general: oversized head, slim/simple limbs, bold readable outline, smooth polished surface, squash and stretch for life.
- [mem] working rules to apply in the blockout (my judgement, not sourced): build joints as overlapping spheres with generous smin k (about 0.3-0.6 of limb radius) so there is no neck/elbow crease; keep each primitive's volume roughly equal to rest (cat does not lose mass when it curls); poses should read as 3-4 big masses; keep ankle/wrist-less nub paws as balls tangent-blended into limbs; tail tube constant radius with spherical cap, no kinks (spline with min bend radius > tube radius); head rigid so face-less silhouette stays identical across poses; avoid thin gaps between body and limb (smin fills them with webbing); check silhouette from front/side/top at 3 angles.
- Sources:
  - Good Smile chibi product page (context only) | https://goodsmile.info/en/products/10068
  - Chibi/vinyl silhouette search: no authoritative technical source found.

## Fit for us (ranked, fully scripted, smooth surface, no fold lines)
1. SDF smooth union (cubic or polynomial smin) of primitives, sampled in numpy, marching cubes only as the target surface: gives an analytically smooth, fold-free target with no AI lumps; blend radius is one tunable number.
2. Wrap via SDF morph / projection WITH tangential relaxation (iterate: Laplacian step in tangent plane, reproject onto SDF using gradient, head pinned): keeps vertex spacing even; this is the missing piece vs plain shrinkwrap.
3. Delta-style smoothing of the displacement field (Jacobi/Laplacian on rest->target offsets, head anchored) before writing the shape key: removes residual fold lines without rounding the cat's own form; Blender Corrective Smooth does a similar job but only inside Blender, so bake it.
4. Shrinkwrap Target Normal Project + Smooth/Laplacian passes: usable in Blender headless and smoother than Nearest Surface Point, but slower and still gives uneven spacing without the relax loop.
5. Surface Deform from a bound proxy cage: good for rough pose transfer; smoothness is limited by the proxy, bind can fail on target validity rules, so use only if the wrap step proves unstable.
6. Metaballs / Blender SDF Grid Boolean / Volume to Mesh: fine for a quick look, but Blender SDF union is hard min (no smooth radius) and metaball control is fiddly; numpy smin is easier to script and verify.
7. Sculpting-based corrective shape keys: not applicable (no manual sculpting); only the "Apply as Shape Key" bake step is needed.
