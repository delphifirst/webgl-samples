function MouseDrag(canvas, distance)
{
	canvas.addEventListener("mousedown", onMouseDown);

	var preX, preY;
	var alpha = -Math.PI / 2, beta = 0;
	var baseAlpha, baseBeta;
	var betaLimit = Math.PI / 180 * 85;

	this.getViewMatrix = function()
	{
		var viewMatrix = mat4.create();
		var eyePos = this.getEyePos();
	    mat4.lookAt(viewMatrix, eyePos, [0, 0, 0], [0, 1, 0]);
		return viewMatrix
	}

	this.getEyePos = function()
	{
		var result = vec3.create();
		var horizontalDistance = Math.cos(beta) * distance;
		var eyePosX = Math.cos(alpha) * horizontalDistance;
		var eyePosY = Math.sin(beta) * distance;
		var eyePosZ = - Math.sin(alpha) * horizontalDistance;
		vec3.set(result, eyePosX, eyePosY, eyePosZ);
		return result;
	}

	function onMouseDown(event)
	{
		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
        preX = event.clientX;
        preY = event.clientY;
		baseAlpha = alpha;
		baseBeta = beta;
	}

	function onMouseMove(event)
	{
		var r = canvas.getBoundingClientRect();
		var deltaAlpha = -(event.clientX - preX) * Math.PI / 300;
		var deltaBeta = (event.clientY - preY) * Math.PI / 300;
		alpha = baseAlpha + deltaAlpha;
		beta = baseBeta + deltaBeta;
		if(beta < -betaLimit)
			beta = -betaLimit;
		if(beta > betaLimit)
			beta = betaLimit;
	}

	function onMouseUp(event)
	{
		document.removeEventListener("mousemove", onMouseMove);
		document.removeEventListener("mouseup", onMouseUp);
	}
}
