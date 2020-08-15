//Вопросы
//- как понормальному вызват ьанимате вместо локал анимате
//- как сделать clock

var video,
    videoTexture,
    movieScreen,
    autoplay = (page_object_params.vars.autoplay ?? 0) == 1,
    muted = (page_object_params.vars.muted ?? 0) == 1,
    loop = (page_object_params.vars.loop ?? 0) == 1,
    planeWidth = parseFloat(page_object_params.vars.Plane_Width ?? 1),
    planeHeight = parseFloat(page_object_params.vars.Plane_Height ?? 1),
    planeRollUpWidth = parseFloat(
        page_object_params.vars.Plane_Roll_Up_Width ?? 0.2
    ),
    rollUpTime = parseFloat(page_object_params.vars.Roll_Up_Time ?? 5),
    stage = "loading";

var movieMaterial;
var loadingTexture;
var time = 0.0;
var progress = 0.0;
var endTime;

const make_video_texture = () => {
    videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat;
};

const make_mesh = () => {
    /*
    var movieMaterial = new THREE.MeshBasicMaterial({
        map: videoTexture,
        side: THREE.DoubleSide
    });
*/
    movieMaterial = new THREE.ShaderMaterial({
        uniforms: {
            //Declare texture uniform in shader
            external_texture: { type: "t", value: null },
            //time: { value: 0.0 },
            progress: { value: 0.0 },
            initial_bounds: new THREE.Uniform(new THREE.Vector4()),
            bounds: new THREE.Uniform(new THREE.Vector4())
        },
        vertexShader: `
				varying vec2 vUv;
				varying vec3 vertexWorldPos;

				void main() {
					vUv = uv;
					vertexWorldPos = position;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
				}
			`,
        fragmentShader: `
				uniform sampler2D external_texture;
				varying vec2 vUv;
				varying vec3 vertexWorldPos;
				uniform float progress;
				uniform vec4 initial_bounds;
				uniform vec4 bounds;

				void main()
				{
					gl_FragColor = texture2D(external_texture, vUv);

					//if (vertexWorldPos.y>progress)

					if (progress<1.0)
					{
						if (progress<0.3)
							gl_FragColor.a = progress*(1.0/0.3);

						float left = initial_bounds.x;
						float right = initial_bounds.y;
						float bottom = initial_bounds.z;
						float top = initial_bounds.w;

						float max_left = bounds.x;
						float max_right = bounds.y;
						float max_bottom = bounds.z;
						float max_top = bounds.w;

						left -= (left-max_left)*progress;
						right += (max_right-right)*progress;
						bottom -= (bottom-max_bottom)*progress;
						top += (max_top-top)*progress;

						float x = vertexWorldPos.x;
						float y = vertexWorldPos.y;

						if (x<left || x>right || y<bottom || y> top)
							gl_FragColor.a = 0.0;
					}

				}
			`
    });

    movieMaterial.side = THREE.DoubleSide;
    movieMaterial.transparent = true;
    movieMaterial.uniforms.initial_bounds.value = new THREE.Vector4(
        -planeWidth / 2,
        -planeWidth / 2 + planeRollUpWidth,
        -planeHeight / 2,
        planeHeight / 2
    );
    movieMaterial.uniforms.bounds.value = new THREE.Vector4(
        -planeWidth / 2,
        planeWidth / 2,
        -planeHeight / 2,
        planeHeight / 2
    );

    /* the geometry on which the movie will be displayed;
        // 		movie image will be scaled to fit these dimensions.*/
    var movieGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 1, 1);
    movieScreen = new THREE.Mesh(movieGeometry, movieMaterial);
    movieScreen.rotation.x = -Math.PI / 2;
    movieScreen.position.y = 0.01;

    return movieScreen;
};

const make_object = () => {
    const mesh = make_mesh();
    return {
        get name() {
            return Helper.UrlToObjectName(page_object_params.vars.url);
        },
        mesh,
        animate(dt) {
            //console.log({ args });
            time += dt;

            //State 1. Loading.
            if (stage == "loading") {
                movieMaterial.uniforms.external_texture.value = loadingTexture;
                movieMaterial.uniforms.progress.value = progress;
                progress += dt / rollUpTime;
                if (progress > 1) progress = 1;
            }
            //State 2. Video.
            else if (stage == "playing") {
                movieMaterial.uniforms.external_texture.value = videoTexture;
                movieMaterial.uniforms.progress.value = 1.0;
            }
            //State 3. Unloading.
            else if (stage == "ending" && time < endTime + rollUpTime) {
                movieMaterial.uniforms.external_texture.value = loadingTexture;
                movieMaterial.uniforms.progress.value = progress;
                progress -= dt / rollUpTime;
                if (progress < 0) progress = 0;
            }
        },
        destroy() {
            if (video) {
                video.pause();
                video.remove();
            }
            mesh.geometry.dispose();
            if (videoTexture) videoTexture.dispose();
            mesh.material.dispose();
        },
        get media() {
            return video;
        }
    };
};

const make_video = () => {
    new Helper.VideoLoader().load(page_object_params.vars.url).then(v => {
        video = v;

        video.loop = loop;
        video.autoplay = autoplay;
        if (autoplay) {
            video.muted = true;
        } else {
            video.pause();
            video.muted = muted;
        }

        make_video_texture();
        stage = "playing";

        video.onended = () => {
            endTime = time;
            stage = "ending";
        };
    });
};

// XXX s.yaglov onload not fires on mobile safari. WHY???
new THREE.TextureLoader().load(
    page_object_params.vars.loading_url,
    image_texture => {
        /*image_texture.offset.set(0.2, 0.2);
        image_texture.repeat.set(5, 5);
        */
        loadingTexture = image_texture;
        resolve(make_object());
        setTimeout(make_video, rollUpTime * 1000);
    }
);

/*
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
*/
