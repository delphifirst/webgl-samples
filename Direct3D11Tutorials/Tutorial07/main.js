var gl;
var shaderInfo = {};
var verticesBuffer;
var indicesBuffer;
var texture;
var startTime, lastUpdateTime;

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
    var fragmentShader = getShader("shader-fs");

    shaderInfo.program = gl.createProgram();
    gl.attachShader(shaderInfo.program, vertexShader);
    gl.attachShader(shaderInfo.program, fragmentShader);
    gl.linkProgram(shaderInfo.program);

    if(!gl.getProgramParameter(shaderInfo.program, gl.LINK_STATUS))
        alert("Unable to initialize the shader program.");

    shaderInfo.attributes = {};
    shaderInfo.attributes.pos = gl.getAttribLocation(shaderInfo.program, "pos");
    shaderInfo.attributes.texcoord = gl.getAttribLocation(shaderInfo.program, "texcoord");
    gl.enableVertexAttribArray(shaderInfo.attributes.pos);
    gl.enableVertexAttribArray(shaderInfo.attributes.texcoord);

    shaderInfo.uniforms = {};
    shaderInfo.uniforms.modelMatrix = gl.getUniformLocation(shaderInfo.program, "modelMatrix");
    shaderInfo.uniforms.viewMatrix = gl.getUniformLocation(shaderInfo.program, "viewMatrix");
    shaderInfo.uniforms.projectionMatrix = gl.getUniformLocation(shaderInfo.program, "projectionMatrix");
    shaderInfo.uniforms.sampler = gl.getUniformLocation(shaderInfo.program, "sampler");
    shaderInfo.uniforms.meshColor = gl.getUniformLocation(shaderInfo.program, "meshColor");
}

function initResources()
{
    var vertices = [
        -1.0, 1.0, 1.0,		1.0, 0.0,
        1.0, 1.0, 1.0,		0.0, 0.0,
        1.0, 1.0, -1.0,		0.0, 1.0,
        -1.0, 1.0, -1.0,	1.0, 1.0,

        -1.0, -1.0, 1.0,	0.0, 0.0,
        1.0, -1.0, 1.0,		1.0, 0.0,
        1.0, -1.0, -1.0,	1.0, 1.0,
        -1.0, -1.0, -1.0,	0.0, 1.0,

        -1.0, -1.0, -1.0,	0.0, 1.0,
        -1.0, -1.0, 1.0,	1.0, 1.0,
        -1.0, 1.0, 1.0,		1.0, 0.0,
        -1.0, 1.0, -1.0,	0.0, 0.0,

        1.0, -1.0, -1.0,	1.0, 1.0,
        1.0, -1.0, 1.0,		0.0, 1.0,
        1.0, 1.0, 1.0,		0.0, 0.0,
        1.0, 1.0, -1.0,		1.0, 0.0,

        -1.0, -1.0, 1.0,	0.0, 1.0,
        1.0, -1.0, 1.0,		1.0, 1.0,
        1.0, 1.0, 1.0,		1.0, 0.0,
        -1.0, 1.0, 1.0,		0.0, 0.0,

        -1.0, -1.0, -1.0,	1.0, 1.0,
        1.0, -1.0, -1.0,	0.0, 1.0,
        1.0, 1.0, -1.0,		0.0, 0.0,
        -1.0, 1.0, -1.0,	1.0, 0.0,
    ];

    var indices = [
        3,0,1,		2,3,1,

        6,5,4,		7,6,4,

        11,8,9,		10,11,9,

        14,13,12,	15,14,12,

        19,16,17,	18,19,17,

        22,21,20,	23,22,20
    ];

    verticesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    indicesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    var textureImage = document.getElementById("texture");
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, textureImage);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
}

function initProgram()
{
    gl.clearColor(0.098039225, 0.098039225, 0.439215720, 1.000000000);
    gl.clearDepth(1.0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    startTime = lastUpdateTime = (new Date).getTime();
}

function updateFps(deltaTime)
{
    var labelFps = document.getElementById("labelFps");
    labelFps.innerHTML = "FPS: " + (1000 / deltaTime).toFixed(1);
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

    var meshColor = [(Math.sin(t * 1.0) + 1.0) * 0.5, (Math.cos(t * 3.0) + 1.0) * 0.5, (Math.sin(t * 5.0) + 1.0) * 0.5];

    var modelMatrixCube = mat4.create();
    mat4.fromYRotation(modelMatrixCube, -t);

    var viewMatrix = mat4.create();
    var eyePos = vec3.create();
    vec3.set(eyePos, 0, 3, 6);
    var centerPos = vec3.create();
    vec3.set(centerPos, 0, 1, 0);
    var upDirection = vec3.create();
    vec3.set(upDirection, 0, 1, 0);
    mat4.lookAt(viewMatrix, eyePos, centerPos, upDirection);

    var projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, Math.PI / 4, 800 / 600, 0.01, 100);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.vertexAttribPointer(shaderInfo.attributes.pos, 3, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(shaderInfo.attributes.texcoord, 2, gl.FLOAT, false, 20, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Render cube
    gl.useProgram(shaderInfo.program);
    gl.uniformMatrix4fv(shaderInfo.uniforms.modelMatrix, false, modelMatrixCube);
    gl.uniformMatrix4fv(shaderInfo.uniforms.viewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(shaderInfo.uniforms.projectionMatrix, false, projectionMatrix);
    gl.uniform1i(shaderInfo.uniforms.sampler, 0);
    gl.uniform3fv(shaderInfo.uniforms.meshColor, meshColor);

    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}

function start()
{
    initWebGL();
    if(gl)
    {
        initShaders();
        initResources();
        initProgram();
        setInterval(render, 1000 / 60);
    }
}
