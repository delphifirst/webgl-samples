var gl;
var shaderInfos = {};	// store informations of each shader (shader program, uniforms, attributes...)
var verticesBuffer;	// vertex buffer of cube
var indicesBuffer;	// index buffer of cube
var framebuffer;	// framebuffer used for offscreen rendering of the dynamic cubemap
var cubeTexture;	// the dynamic cubemap
var mouseDrag;		// used to process mouse drag event
var startTime, lastUpdateTime;

var OFFSCREEN_FRAMEBUFFER_SIZE;		// resolution of cubemap faces
var SATELLITE_CUBES_COLOR;
var SATELLITE_CUBES_POSITION;

var CUBE_DIRECTIONS;	// FORWARD direction of each cubemap face
var CUBE_DIRECTIONS_UP;	// UP direction of each cubemap face
var CUBE_TEXTURES_FACE;	// webgl representation of each cubemap face

var CANVAS_WIDTH, CANVAS_HEIGHT;

function initWebGL()
{
    var canvas = document.getElementById("glcanvas");
    try
    {
        gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
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

function initConsts()
{
	OFFSCREEN_FRAMEBUFFER_SIZE = 1024;
	SATELLITE_CUBES_COLOR = [
		[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, 0, 1], [0, 1, 1]
	];
	SATELLITE_CUBES_POSITION = [
		[3, 0, 0], [-4, 0, 0], [0, 4, 0], [0, -5, 0], [0, 0, 4], [0, 0, -4]
	];
	CUBE_DIRECTIONS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
	CUBE_DIRECTIONS_UP = [[0, 1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1], [0, 1, 0], [0, 1, 0]];
	CUBE_TEXTURES_FACE = [gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
		gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
		gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z];
	var canvas = document.getElementById("glcanvas");
	CANVAS_WIDTH = canvas.width;
	CANVAS_HEIGHT = canvas.height;
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

function initShaders()
{
    var vertexShader = getShader("shader-vs");
    var cubemapFragmentShader = getShader("cubemap-shader-fs");
	var colorFragmentShader = getShader("color-shader-fs");

    shaderInfos.cubemap = {}
	shaderInfos.cubemap.program = gl.createProgram();
    gl.attachShader(shaderInfos.cubemap.program, vertexShader);
    gl.attachShader(shaderInfos.cubemap.program, cubemapFragmentShader);
    gl.linkProgram(shaderInfos.cubemap.program);

	shaderInfos.color = {}
	shaderInfos.color.program = gl.createProgram();
    gl.attachShader(shaderInfos.color.program, vertexShader);
    gl.attachShader(shaderInfos.color.program, colorFragmentShader);
    gl.linkProgram(shaderInfos.color.program);

    if(!gl.getProgramParameter(shaderInfos.cubemap.program, gl.LINK_STATUS)
			|| !gl.getProgramParameter(shaderInfos.color.program, gl.LINK_STATUS))
        alert("Unable to initialize the shader program.");

    shaderInfos.cubemap.attributes = {};
    shaderInfos.cubemap.attributes.pos = gl.getAttribLocation(shaderInfos.cubemap.program, "pos");
    gl.enableVertexAttribArray(shaderInfos.cubemap.attributes.pos);
	shaderInfos.cubemap.attributes.normal = gl.getAttribLocation(shaderInfos.cubemap.program, "normal");
    gl.enableVertexAttribArray(shaderInfos.cubemap.attributes.normal);

	shaderInfos.color.attributes = {};
    shaderInfos.color.attributes.pos = gl.getAttribLocation(shaderInfos.color.program, "pos");
    gl.enableVertexAttribArray(shaderInfos.color.attributes.pos);
	shaderInfos.color.attributes.normal = gl.getAttribLocation(shaderInfos.color.program, "normal");
    gl.enableVertexAttribArray(shaderInfos.color.attributes.normal);

    shaderInfos.cubemap.uniforms = {};
    shaderInfos.cubemap.uniforms.modelMatrix = gl.getUniformLocation(shaderInfos.cubemap.program, "modelMatrix");
    shaderInfos.cubemap.uniforms.viewMatrix = gl.getUniformLocation(shaderInfos.cubemap.program, "viewMatrix");
    shaderInfos.cubemap.uniforms.projectionMatrix = gl.getUniformLocation(shaderInfos.cubemap.program, "projectionMatrix");
    shaderInfos.cubemap.uniforms.meshColor = gl.getUniformLocation(shaderInfos.cubemap.program, "meshColor");
	shaderInfos.cubemap.uniforms.sampler = gl.getUniformLocation(shaderInfos.cubemap.program, "sampler");
	shaderInfos.cubemap.uniforms.eyePos = gl.getUniformLocation(shaderInfos.cubemap.program, "eyePos");

	shaderInfos.color.uniforms = {};
    shaderInfos.color.uniforms.modelMatrix = gl.getUniformLocation(shaderInfos.color.program, "modelMatrix");
    shaderInfos.color.uniforms.viewMatrix = gl.getUniformLocation(shaderInfos.color.program, "viewMatrix");
    shaderInfos.color.uniforms.projectionMatrix = gl.getUniformLocation(shaderInfos.color.program, "projectionMatrix");
    shaderInfos.color.uniforms.meshColor = gl.getUniformLocation(shaderInfos.color.program, "meshColor");
}

function initResources()
{
    verticesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ModelCube.vertices), gl.STATIC_DRAW);

    indicesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ModelCube.indices), gl.STATIC_DRAW);

	var renderbuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, OFFSCREEN_FRAMEBUFFER_SIZE, OFFSCREEN_FRAMEBUFFER_SIZE);
	framebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

	// allocate space for the dynamic cubemap
	cubeTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
	for(var i = 0; i < 6; ++i)
	{
		gl.texImage2D(CUBE_TEXTURES_FACE[i], 0, gl.RGBA,
			OFFSCREEN_FRAMEBUFFER_SIZE, OFFSCREEN_FRAMEBUFFER_SIZE,
			0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	}
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
}

function initProgram()
{
    gl.clearColor(0.0, 0.0, 0.0, 1.000000000);
    gl.clearDepth(1.0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    startTime = lastUpdateTime = (new Date).getTime();
	mouseDrag = new MouseDrag(document.getElementById("glcanvas"), 6);
}

function updateFps(deltaTime)
{
    var labelFps = document.getElementById("labelFps");
    labelFps.innerHTML = "FPS: " + (1000 / deltaTime).toFixed(1);
}

function drawSatelliteCube(t, viewMatrix, projectionMatrix, meshColor, translation)
{
	var rotationMatrix = mat4.create();
    mat4.fromXRotation(rotationMatrix, t * 3);
	var scaleMatrix = mat4.create();
	mat4.fromScaling(scaleMatrix, [0.2, 0.2, 0.2]);
	var translateMatrix = mat4.create();
	mat4.fromTranslation(translateMatrix, translation);
	var modelMatrix = translateMatrix;
	mat4.mul(modelMatrix, modelMatrix, rotationMatrix);
	mat4.mul(modelMatrix, modelMatrix, scaleMatrix);

	gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.vertexAttribPointer(shaderInfos.color.attributes.pos, 3, gl.FLOAT, false, 24, 0);
	gl.vertexAttribPointer(shaderInfos.color.attributes.normal, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);

    // Render cube
    gl.uniformMatrix4fv(shaderInfos.color.uniforms.modelMatrix, false, modelMatrix);
    gl.uniformMatrix4fv(shaderInfos.color.uniforms.viewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(shaderInfos.color.uniforms.projectionMatrix, false, projectionMatrix);
    gl.uniform3fv(shaderInfos.color.uniforms.meshColor, meshColor);

    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}

function drawMainCube(t, viewMatrix, projectionMatrix)
{
	var meshColor = [0.5, 0.5, 0.5];

	var modelMatrix = mat4.create();

	gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.vertexAttribPointer(shaderInfos.cubemap.attributes.pos, 3, gl.FLOAT, false, 24, 0);
	gl.vertexAttribPointer(shaderInfos.cubemap.attributes.normal, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);

    // Render cube
    gl.uniformMatrix4fv(shaderInfos.cubemap.uniforms.modelMatrix, false, modelMatrix);
    gl.uniformMatrix4fv(shaderInfos.cubemap.uniforms.viewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(shaderInfos.cubemap.uniforms.projectionMatrix, false, projectionMatrix);
    gl.uniform3fv(shaderInfos.cubemap.uniforms.meshColor, meshColor);

    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}

function render()
{
    var currentTime = (new Date).getTime();
    var deltaTime = currentTime - lastUpdateTime;
    if(deltaTime == 0)
        deltaTime = 1;
    lastUpdateTime = currentTime;

    updateFps(deltaTime);

    var t = (currentTime - startTime) / 1000;

	gl.useProgram(shaderInfos.color.program);

	gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);

	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	gl.viewport(0, 0, OFFSCREEN_FRAMEBUFFER_SIZE, OFFSCREEN_FRAMEBUFFER_SIZE);
	for(var i = 0; i < 6; ++i)
	{
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, CUBE_TEXTURES_FACE[i], cubeTexture, 0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		var viewMatrix = mat4.create();
	    mat4.lookAt(viewMatrix, [0, 0, 0], CUBE_DIRECTIONS[i], CUBE_DIRECTIONS_UP[i]);
		var reflectMatrix = mat4.create();
		mat4.fromScaling(reflectMatrix, [-1, -1, 1]);
		mat4.mul(viewMatrix, reflectMatrix, viewMatrix);
	    var projectionMatrix = mat4.create();
	    mat4.perspective(projectionMatrix, Math.PI / 2, 1, 0.01, 100);

		for(var j = 0; j < 6; ++j)
			drawSatelliteCube(t, viewMatrix, projectionMatrix, SATELLITE_CUBES_COLOR[j], SATELLITE_CUBES_POSITION[j]);
	}
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.useProgram(shaderInfos.cubemap.program);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
	gl.uniform1i(shaderInfos.cubemap.uniforms.sampler, 0);

	var viewMatrix = mouseDrag.getViewMatrix();
	var eyePos = mouseDrag.getEyePos();

	gl.uniform3fv(shaderInfos.cubemap.uniforms.eyePos, eyePos);

    var projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, Math.PI / 4, CANVAS_WIDTH / CANVAS_HEIGHT, 0.01, 100);

    drawMainCube(t, viewMatrix, projectionMatrix);

	gl.useProgram(shaderInfos.color.program);
	for(var j = 0; j < 6; ++j)
		drawSatelliteCube(t, viewMatrix, projectionMatrix, SATELLITE_CUBES_COLOR[j], SATELLITE_CUBES_POSITION[j]);
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
