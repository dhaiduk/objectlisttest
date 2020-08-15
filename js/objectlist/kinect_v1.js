// comment
var g_pointScale = 0.005;
 var video, videoImage, videoImageContext, videoTexture;
 
 var autoplay = (page_object_params.vars.autoplay || 1) == 1,
     muted = (page_object_params.vars.muted || 1) == 1,
     loop = (page_object_params.vars.loop || 1) == 1;
 
 var movieScreen;
 var movieMaterial;
 
 var time = 0.0;
 
 var mask_data, group;
 
 var urls = {
     video: page_object_params.vars.video_url,
     mask: page_object_params.vars.mask_url
 };
 
 const clock = new THREE.Clock();
 
 function loadImage(url) {
     return new Promise((resolve, reject) => {
         const img = new Image();
         img.crossOrigin = "anonymous";
         img.onload = e => {
             resolve(img);
         };
         img.onerror = reject;
         img.src = url;
     });
 }
 
 function loadVideo(url) {
     return new Helper.VideoLoader().load(url);
 }
 
 function getImageData(img) {
     const ctx = document.createElement("canvas").getContext("2d");
     ctx.canvas.width = img.width;
     ctx.canvas.height = img.height;
     ctx.drawImage(img, 0, 0);
     return ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
 }
 
 function getPixelXY(imageData, x, y) {
     if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
         return [0, 0, 0, 0];
     } else {
         const offset = (y * imageData.width + x) * 4;
         return Array.from(imageData.data.slice(offset, offset + 4)).map(
             v => v / 255
         );
     }
 }
 
 const make_mesh = () => {
     videoTexture = new THREE.Texture(videoImage);
     videoTexture.minFilter = THREE.NearestFilter;
     videoTexture.magFilter = THREE.NearestFilter;
 
     movieMaterial = new THREE.ShaderMaterial({
         uniforms: {
             /*Declare texture uniform in shader*/
             texture: { type: "t", value: null },
             /*depthmap: { type: 't', value: null },*/
             xyScale: { value: 1.0 },
             time: { value: 1.0 },
             pointScale: { value: g_pointScale * renderer.getSize().height }
         },
         vertexShader: `
             varying vec2 vUv;
             varying vec4 clr;
             uniform sampler2D texture;
             uniform float xyScale;
             uniform float time;
             uniform float pointScale;
 
             varying vec3 vertexWorldPos;
 
             void main() {
                 float mapWidth = 512.0;
                 float mapHeight = 1024.0;
 
                 float depthWidth = 640.0;
                 float depthHeight = 480.0;
 
                 vUv = vec2(position.x/mapWidth, 1.0-position.y/mapHeight);
                 clr = texture2D(texture, vUv);
 
                 vec2 vUv2 = vec2(vUv[0],vUv[1]-(1.0/mapHeight)*(depthHeight+1.0));
                 vec4 depthData = texture2D(texture, vUv2);
 
                 vec3 pos;
 
                 //Gray
                 float depth = (depthData[0]+depthData[1]+depthData[2])/3.0;
 
                 if (abs(depthData[0]-depthData[1])>0.05 || abs(depthData[0]-depthData[2])>0.05)
                 {
                     clr.a = 0.0;
                     pos.y = 1000.0;
                 }else
                 {
 
                     float min_depth = 1.5;
                     float max_depth = 3.0;
                     float realDepth = 1.5 + depth * (max_depth-min_depth);
 
                     pos.x = (position.x-(depthWidth/2.0-0.5))*xyScale*realDepth;
                     pos.y = -(position.y-(depthHeight/2.0-0.5))*xyScale*realDepth;
                     pos.z = realDepth;
                 }
 
                 if (depth<0.1)
                 {
                     clr.a = 0.0;
                     pos.y = 1000.0;
                 }
 
 
                 //Todo - uncomment for starwar holo
                     /*
                     //Glith
                     float m_GlitchIntensity = 0.15;
                     float m_GlitchSpeed = 30.0;
                     pos.x += m_GlitchIntensity * step(0.5, sin(time * 2.0 + pos.y * 1.0)) * step(0.99, sin(time * m_GlitchSpeed * 0.5));
                 */
 
                 vec4 mvPos = modelViewMatrix * vec4(pos,1.0);
                 gl_Position = projectionMatrix * mvPos;
 
                 gl_PointSize = pointScale/length(mvPos.xyz);
 
                 vertexWorldPos = pos;
 
             }
    `,
         fragmentShader: `
             varying vec2 vUv;
             varying vec4 clr;
             uniform float time;
 
             varying vec3 vertexWorldPos;
 
             float rand(float n){
                 return fract(sin(n) * 43758.5453123);
             }
 
             float noise(float p){
                 float fl = floor(p);
                 float fc = fract(p);
                 return mix(rand(fl), rand(fl + 1.0), fc);
             }
 
             void main()
             {
                 gl_FragColor = clr;
 
                 //Todo - uncomment for starwar holo
                 /*
                 //Scan effect
                 float m_BarSpeed = 1.0;
                 float m_BarDistance = 40.0;
                 float bars = 0.0;
                 float val = time * m_BarSpeed + vertexWorldPos.y * m_BarDistance;
                 bars = step(val - floor(val), 0.5) * 0.65;
 
                 //Flickering
                 float flicker = 1.0;
                 float m_FlickerSpeed = 20.0;
                 flicker = clamp(noise(time * m_FlickerSpeed), 0.4, 1.0);
 
                 //Glow
                 float glow = 0.0;
                 float  m_GlowDistance = 0.5;
                 float m_GlowSpeed= 1.0;
                 float tempGlow = vertexWorldPos.y * m_GlowDistance -time* m_GlowSpeed;
                 glow = tempGlow - floor(tempGlow);
 
                 vec4 m_MainColor = vec4 (0.5,1.0,1.0,1.0);
 
                 if (gl_FragColor.a!=0.0)
                 {
                     gl_FragColor = gl_FragColor*m_MainColor+(glow*0.05*m_MainColor);
                     gl_FragColor.a =  clr.a*(bars+glow)*flicker;
                 }
                 */
             }
    `
     });
     movieMaterial.uniforms.texture.value = videoTexture;
     movieMaterial.transparent = true;
 
     /*Create Point Cloud*/
     /*const XM_PIDIV4 = 0.785398163;*/
     const NUI_CAMERA_DEPTH_NOMINAL_HORIZONTAL_FOV = 58.5;
     const DegreesToRadians = 3.14159265359 / 180.0;
     const m_depthWidth = 640;
     const m_depthHeight = 480;
     const m_xyScale =
         Math.tan(
             NUI_CAMERA_DEPTH_NOMINAL_HORIZONTAL_FOV * DegreesToRadians * 0.5
         ) /
         (m_depthWidth * 0.5);
     movieMaterial.uniforms.xyScale.value = m_xyScale;
 
     const positions = [];
     /*const colors = [];*/
     /*const color = new THREE.Color();*/
 
     for (let y = 0; y < 480; ++y) {
         for (let x = 0; x < 512; ++x) {
             const mask = getPixelXY(mask_data, x, y)[0];
             if (mask == 1) {
                 positions.push(x, y, 0);
             }
         }
     }
 
     const geometry = new THREE.BufferGeometry();
     geometry.setAttribute(
         "position",
         new THREE.Float32BufferAttribute(positions, 3)
     );
 
     movieScreen = new THREE.Points(geometry, movieMaterial);
     movieScreen.position.set(0, 2.1, -2.1);
     movieScreen.rotation.x = Math.PI / 8 + 0.1;
     movieScreen.frustumCulled = false;
 
     var group_standup = new THREE.Group();
     group_standup.rotation.x = Math.PI / 2;
     group_standup.rotation.y = Math.PI;
     group_standup.add(movieScreen);
 
     group = new THREE.Group();
     group.rotation.x = -Math.PI / 2;
     group.add(group_standup);
 
     var cube = new THREE.Mesh(
         new THREE.BoxGeometry(0.9, 0.5, 2), //new THREE.PlaneGeometry(0.5, 0.5, 2),//
         new THREE.MeshBasicMaterial({
             color: 0xa6cfe2,
             side: THREE.DoubleSide,
             transparent: true,
             opacity: 0, //0.5, //
             depthWrite: false
         })
     );
     cube.position.z = 1;
     cube.name = "helper_object_mesh";
     group.add(cube);
 
     group.boundingBox = new THREE.Box3().setFromObject(cube);
     group.size3 = new THREE.Vector3();
     group.boundingBox.getSize(group.size3);
 
     return group;
 };
 
 const make_object = () => {
     return {
         get name() {
             return Helper.UrlToObjectName(page_object_params.vars.video_url);
         },
         mesh: make_mesh(),
         animate() {
             if (video.readyState >= video.HAVE_CURRENT_DATA && !video.paused) {
                 videoImageContext.drawImage(video, 0, 0);
                 videoTexture.needsUpdate = true;
             }
             time += clock.getDelta();
             movieMaterial.uniforms.time.value = time;
         },
         destroy() {
             video.pause();
             video.remove();
             //delete video;
 
             videoImage.remove();
             //delete videoImage;
         },
         get media() {
             return video;
         }
     };
 };
 
 Promise.all([
     loadImage(urls.mask).then(img => {
         mask_data = getImageData(img);
     }),
     loadVideo(urls.video).then(v => {
         video = v;
 
         video.loop = loop;
         video.autoplay = autoplay;
         if (autoplay) {
             video.muted = true;
         } else {
             video.pause();
             video.muted = muted;
         }
 
         videoImage = document.createElement("canvas");
         videoImage.width = parseInt(video.videoWidth);
         videoImage.height = parseInt(video.videoHeight);
 
         console.log(
             `create canvas ${videoImage.width}x${videoImage.height}`,
             videoImage
         );
 
         videoImageContext = videoImage.getContext("2d");
     })
 ]).then(() => {
     /**/
 
     try {
         videoImageContext.drawImage(video, 0, 0);
         resolve(make_object());
     } catch (e) {
         // XXX s.yaglov ff bug
         if (e.name == "NS_ERROR_NOT_AVAILABLE") {
             reject("FF BUG: NS_ERROR_NOT_AVAILABLE");
         } else {
             reject(e); // throw another exception
         }
     }
 });