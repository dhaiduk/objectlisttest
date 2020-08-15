var video,
    videoTexture,
    movieScreen,
    inited = false,
    loadMetaTimeout,
    autoplay = (page_object_params.vars.autoplay || 0) == 1,
    muted = (page_object_params.vars.muted || 0) == 1,
    loop = (page_object_params.vars.loop || 1) == 1;

const make_mesh = () => {
    videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat;

    var movieMaterial = new THREE.MeshBasicMaterial({
        map: videoTexture,
        side: THREE.DoubleSide
    });

    movieMaterial.side = THREE.DoubleSide;

    /* the geometry on which the movie will be displayed;
        // 		movie image will be scaled to fit these dimensions.*/
    var movieGeometry = new THREE.PlaneGeometry(
        video.videoWidth,
        video.videoHeight,
        4,
        4
    );
    movieScreen = new THREE.Mesh(movieGeometry, movieMaterial);

    return movieScreen;
};

const make_object = () => {
    const mesh = make_mesh();
    return {
        get name() {
            return Helper.UrlToObjectName(page_object_params.vars.url);
        },
        mesh,
        animate() {},
        destroy() {
            clearTimeout(loadMetaTimeout);
            video.pause();
            video.remove();
            mesh.geometry.dispose();
            videoTexture.dispose();
            mesh.material.dispose();
        },
        get media() {
            return video;
        }
    };
};

new Helper.VideoLoader()
    .load(page_object_params.vars.url)
    .then(v => {
        video = v;

        video.loop = loop;
        video.autoplay = autoplay;
        if (autoplay) {
            video.muted = true;
        } else {
            video.pause();
            video.muted = muted;
        }

        resolve(make_object());
    })
    .catch(e => {
        reject(e);
    });
