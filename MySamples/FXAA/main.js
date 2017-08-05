var gl;
var shaderInfos = {};	// store informations of each shader (shader program, uniforms, attributes...)
var vertexBuffers = {};
var indexBuffers = {};
var smallFramebuffer, normalFramebuffer, currentFramebuffer;
var smallColorbuffer, normalColorbuffer, currentColorbuffer;
var fxaaSmallFramebuffer, fxaaNormalFramebuffer, fxaaCurrentFramebuffer;
var fxaaSmallColorbuffer, fxaaNormalColorbuffer, fxaaCurrentColorbuffer;
var mouseDrag;		// used to process mouse drag event
var startTime, lastUpdateTime;

var isScaleUp = false;
var mode = 0;

var internalViewportWidth, internalViewportHeight;

var CANVAS_WIDTH, CANVAS_HEIGHT;
var SCALE = 8;

function initWebGL()
{
    var canvas = document.getElementById("glcanvas");
    try
    {
        gl = canvas.getContext("webgl", {antialias: false}) || canvas.getContext("experimental-webgl", {antialias: false});
    }
    catch (e)
    {
    }
    if(!gl)
    {
        alert("Your browser doesn't appear to support WebGL.");
        gl = null;
    }
}

function getShader(id)
{
    shaderScript = document.getElementById(id);
    if(!shaderScript)
        return null;
    shaderSource = "";
    currentChild = shaderScript.firstChild;
    while(currentChild)
    {
        if(currentChild.nodeType == currentChild.TEXT_NODE)
            shaderSource += currentChild.textContent;
        currentChild = currentChild.nextSibling;
    }

    var shader = null;
    if(shaderScript.type == "x-shader/x-vertex")
        shader = gl.createShader(gl.VERTEX_SHADER);
    else if(shaderScript.type == "x-shader/x-fragment")
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    else
        return null;

    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    {
        alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function getShaderInfo(vertexShaderId, fragmentShaderId, attributeList, uniformList)
{
    var vertexShader = getShader(vertexShaderId);
    var fragmentShader = getShader(fragmentShaderId);
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program, gl.LINK_STATUS))
    {
        alert("Unable to initialize the shader program.");
        return null;
    }

    var attributes = {};
    for(var i = 0; i < attributeList.length; ++i)
    {
        attributeName = attributeList[i];
        attributes[attributeName] = gl.getAttribLocation(program, attributeName);
        gl.enableVertexAttribArray(attributes[attributeName]);
    }

    var uniforms = {};
    for(var i = 0; i < uniformList.length; ++i)
    {
        uniformName = uniformList[i];
        uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
    }

    var shaderInfo = {};
    shaderInfo.program = program;
    shaderInfo.attributes = attributes;
    shaderInfo.uniforms = uniforms;
    return shaderInfo;
}

function initShaders()
{
	shaderInfos.color = getShaderInfo("color-shader-vs", "color-shader-fs",
        ["pos", "normal"],
        ["modelMatrix", "invTransModelMatrix", "viewMatrix", "projectionMatrix", "meshColor", "lightDirection"]);
    shaderInfos.screen = getShaderInfo("screen-shader-vs", "screen-shader-fs",
        ["pos", "uv"], ["sampler"]);
    shaderInfos.fxaa = getShaderInfo("screen-shader-vs", "fxaa-shader-fs",
        ["pos", "uv"], ["sampler"]);
}

function initResources()
{
    vertexBuffers.cube = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers.cube);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ModelCube.vertices), gl.STATIC_DRAW);

    indexBuffers.cube = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffers.cube);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ModelCube.indices), gl.STATIC_DRAW);

    vertexBuffers.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ModelQuad.vertices), gl.STATIC_DRAW);

    indexBuffers.quad = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffers.quad);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ModelQuad.indices), gl.STATIC_DRAW);

    var renderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, CANVAS_WIDTH / SCALE, CANVAS_HEIGHT / SCALE);
    smallColorbuffer = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, smallColorbuffer);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, CANVAS_WIDTH / SCALE, CANVAS_HEIGHT / SCALE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	smallFramebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, smallFramebuffer);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, smallColorbuffer, 0);

    renderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, CANVAS_WIDTH, CANVAS_HEIGHT);
    normalColorbuffer = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, normalColorbuffer);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, CANVAS_WIDTH, CANVAS_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	normalFramebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, normalFramebuffer);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, normalColorbuffer, 0);

    fxaaSmallColorbuffer = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fxaaSmallColorbuffer);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, CANVAS_WIDTH / SCALE, CANVAS_HEIGHT / SCALE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	fxaaSmallFramebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, fxaaSmallFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fxaaSmallColorbuffer, 0);

    fxaaNormalColorbuffer = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fxaaNormalColorbuffer);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, CANVAS_WIDTH, CANVAS_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	fxaaNormalFramebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, fxaaNormalFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fxaaNormalColorbuffer, 0);
}

function initProgram()
{
    gl.clearColor(0.0, 0.3, 0.5, 1.000000000);
    gl.clearDepth(1.0);
    gl.depthFunc(gl.LEQUAL);
    startTime = lastUpdateTime = (new Date).getTime();
	mouseDrag = new MouseDrag(document.getElementById("glcanvas"), 6);
    document.getElementById("checkbox-scale").checked = isScaleUp;
    document.getElementById("select-mode").selectedIndex = mode;
}

function toggleScale()
{
    isScaleUp = document.getElementById("checkbox-scale").checked;
}

function changeMode()
{
    mode = document.getElementById("select-mode").selectedIndex;
}

function updateFps(deltaTime)
{
    var labelFps = document.getElementById("label-fps");
    labelFps.innerHTML = "FPS: " + (1000 / deltaTime).toFixed(1);
}

function drawCube(shaderInfo, viewMatrix, projectionMatrix, meshColor, translation, scale, lightDirection)
{
	var scaleMatrix = mat4.create();
	mat4.fromScaling(scaleMatrix, scale);
	var translateMatrix = mat4.create();
	mat4.fromTranslation(translateMatrix, translation);
	var modelMatrix = translateMatrix;
	mat4.mul(modelMatrix, modelMatrix, scaleMatrix);

	var invTransModelMatrix = mat4.create();
	mat4.invert(invTransModelMatrix, modelMatrix);
	mat4.transpose(invTransModelMatrix, invTransModelMatrix);

	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers.cube);
    gl.vertexAttribPointer(shaderInfo.attributes.pos, 3, gl.FLOAT, false, 24, 0);
	gl.vertexAttribPointer(shaderInfo.attributes.normal, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffers.cube);

	uniforms = shaderInfo.uniforms;
    gl.uniformMatrix4fv(uniforms.modelMatrix, false, modelMatrix);
	gl.uniformMatrix4fv(uniforms.invTransModelMatrix, false, invTransModelMatrix);
    gl.uniformMatrix4fv(uniforms.viewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(uniforms.projectionMatrix, false, projectionMatrix);
    gl.uniform3fv(uniforms.meshColor, meshColor);
	gl.uniform3fv(uniforms.lightDirection, lightDirection);

    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}

function drawScene(shaderInfo)
{
    var lightDirection = [-1, 3, -2];

	var viewMatrix = mouseDrag.getViewMatrix();
	var projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, Math.PI / 4, CANVAS_WIDTH / CANVAS_HEIGHT, 0.01, 200);

    gl.bindFramebuffer(gl.FRAMEBUFFER, currentFramebuffer);
    gl.viewport(0, 0, internalViewportWidth, internalViewportHeight);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
	gl.useProgram(shaderInfo.program);
	drawCube(shaderInfo, viewMatrix, projectionMatrix, [1, 0, 0], [0, 0, 0], [1, 1, 1], lightDirection);
}

function fxaa(shaderInfo)
{
    gl.bindFramebuffer(gl.FRAMEBUFFER, fxaaCurrentFramebuffer);
    gl.viewport(0, 0, internalViewportWidth, internalViewportHeight);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(shaderInfo.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers.quad);
    gl.vertexAttribPointer(shaderInfo.attributes.pos, 3, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(shaderInfo.attributes.uv, 2, gl.FLOAT, false, 20, 12);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffers.quad);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, currentColorbuffer);

    uniforms = shaderInfo.uniforms;
    gl.uniform1i(uniforms.sampler, 0);

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

function textureToScreen(shaderInfo)
{
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(shaderInfo.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers.quad);
    gl.vertexAttribPointer(shaderInfo.attributes.pos, 3, gl.FLOAT, false, 20, 0);
	gl.vertexAttribPointer(shaderInfo.attributes.uv, 2, gl.FLOAT, false, 20, 12);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffers.quad);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fxaaCurrentColorbuffer);

	uniforms = shaderInfo.uniforms;
	gl.uniform1i(uniforms.sampler, 0);

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

function render()
{
    var currentTime = (new Date).getTime();
    var deltaTime = currentTime - lastUpdateTime;
    if(deltaTime == 0)
        deltaTime = 1;
    lastUpdateTime = currentTime;

    updateFps(deltaTime);

    if(isScaleUp)
    {
        currentFramebuffer = smallFramebuffer;
        currentColorbuffer = smallColorbuffer;
        fxaaCurrentFramebuffer = fxaaSmallFramebuffer;
        fxaaCurrentColorbuffer = fxaaSmallColorbuffer;
        internalViewportWidth = CANVAS_WIDTH / SCALE;
        internalViewportHeight = CANVAS_HEIGHT / SCALE;
    }
    else
    {
        currentFramebuffer = normalFramebuffer;
        currentColorbuffer = normalColorbuffer;
        fxaaCurrentFramebuffer = fxaaNormalFramebuffer;
        fxaaCurrentColorbuffer = fxaaNormalColorbuffer;
        internalViewportWidth = CANVAS_WIDTH;
        internalViewportHeight = CANVAS_HEIGHT;
    }

	drawScene(shaderInfos.color);

    fxaa(shaderInfos.fxaa);

    textureToScreen(shaderInfos.screen);
}

function initConsts()
{
	var canvas = document.getElementById("glcanvas");
	CANVAS_WIDTH = canvas.width;
	CANVAS_HEIGHT = canvas.height;
}

function start()
{
    initWebGL();
	initConsts();
    if(gl)
    {
        initShaders();
        initResources();
        initProgram();
        setInterval(render, 1000 / 60);
    }
}
