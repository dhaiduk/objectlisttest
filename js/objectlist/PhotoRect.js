new THREE.TextureLoader().load(
    page_object_params.vars.url,
    texture => {
        var mesh = new THREE.Object3D();

        var texture_ratio = texture.image.width / texture.image.height;

        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

        var material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide
        });

        var plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);

        plane.scale.set(texture_ratio, 1, 1);

        mesh.add(plane);

        resolve({
            get name() {
                return Helper.UrlToObjectName(page_object_params.vars.url);
            },
            mesh,
            animate() {
                /* noop */
            },
            destroy() {
                plane.geometry.dispose();
                texture.dispose();
            }
        });
    },
    undefined /* not supported */,
    err => reject(err)
);
