let canvas = new fabric.CanvasEx('c'),ctx = canvas.getContext("2d");
let radius = 150, circleStroke = 10;
let textColor = 'rgb(150,150,150)';
let fanColor = 'rgb(240,240,240)';

let financeCircle, relationshipCircle;
let financeLabel, relationshipLabel;

fabric.Object.prototype.set({
    objectCaching: false
});

$(document).ready(function() {
    canvas.setHeight( window.innerHeight);
    canvas.setWidth( window.innerWidth);

    $('#draw-btn').on('click', function() {
        let $fInput = $('#finance-input'),
            $rInput = $('#relationship-input');

        financeCircle.set({
            scaleX: $fInput.val() / 10,
            scaleY: $fInput.val() / 10,
        });
        financeLabel.text = $fInput.val();
        relationshipCircle.set({
            scaleX: $rInput.val() / 10,
            scaleY: $rInput.val() / 10,
        });
        relationshipLabel.text = $rInput.val();
        canvas.renderAll();

        $('#svg-panel').html(canvas.toSVG());
    });

    initObjects();
});

function initObjects() {
    let tmpCircle = new fabric.Circle({
        radius: radius - circleStroke / 4,
        fill: fanColor,
        strokeWidth: 0,
        angle: Math.PI / 2,
        startAngle: - Math.PI / 2,
        endAngle: 0,
        originX: 'center',
        originY: 'center',
        left: radius,
        top: radius,
    });
    tmpCircle.setAngle(0);

    let tmpTriangle = new fabric.Polygon([{x: 0, y: 0}, {x: radius, y: radius}, {x: 0, y: radius}], {
        left: radius,
        top: 0,
        fill: fanColor,
    });

    financeCircle = new fabric.Group([tmpCircle, tmpTriangle], {
        originX: 'center',
        originY: 'center',
        left: window.innerWidth / 2,
        top: window.innerHeight / 2,
    });

    tmpCircle = new fabric.Circle({
        radius: radius - circleStroke / 4,
        fill: fanColor,
        strokeWidth: 0,
        angle: Math.PI / 2,
        startAngle: Math.PI,
        endAngle: - Math.PI / 2,
        originX: 'center',
        originY: 'center',
        left: radius,
        top: radius,
    });
    tmpCircle.setAngle(0);

    tmpTriangle = new fabric.Polygon([{x: 0, y: radius}, {x: radius, y: radius}, {x: radius, y: 0}], {
        left: 0,
        top: 0,
        fill: fanColor,
    });

    relationshipCircle = new fabric.Group([tmpCircle, tmpTriangle], {
        originX: 'center',
        originY: 'center',
        left: window.innerWidth / 2,
        top: window.innerHeight / 2,
        scaleX: 0.6,
        scaleY: 0.6,
    });

    canvas.add(financeCircle, relationshipCircle);

    financeLabel = new fabric.IText('10', {
        originX: 'center',
        originY: 'center',
        left: window.innerWidth / 2 + radius / 2,
        top: window.innerHeight / 2 - radius / 2,
        fill: textColor,
        fontSize: 36,
        angle: 45,
    });
    relationshipLabel = new fabric.IText('6', {
        originX: 'center',
        originY: 'center',
        left: window.innerWidth / 2 - radius / 2,
        top: window.innerHeight / 2 - radius / 2,
        fill: textColor,
        fontSize: 36,
        angle: -45,
    });
    canvas.add(financeLabel, relationshipLabel);

    let circle1 = new fabric.Circle({
        radius: radius,
        fill: 'transparent',
        stroke: 'rgb(56,141,146)',
        strokeWidth: circleStroke,
        originX: 'center',
        originY: 'center',
        left: window.innerWidth / 2,
        top: window.innerHeight / 2,
    });
    canvas.add(circle1);

    let text1 = new fabric.IText('Relationships', {
        fontSize: 20,
        textAlign: "center",
        left: window.innerWidth / 2 + radius,
        top: window.innerHeight / 2 - radius,
        lineHeight: 12,
        fill: 'rgb(56,141,146)',
        opacity:1,

    });
    canvas.add(text1);

    let text2 = new fabric.IText('Finances', {
        fontSize: 20,
        textAlign: "center",
        left: window.innerWidth / 2 - radius,
        top: window.innerHeight / 2 - radius,
        originX: 'right',
        lineHeight: 12,
        fill: 'rgb(56,141,146)',
        opacity:1,

    });
    canvas.add(text2);

    let line1 = new fabric.Line([window.innerWidth / 2, window.innerHeight / 2 - radius + circleStroke / 2, window.innerWidth / 2, window.innerHeight / 2 + radius - circleStroke / 2 ], {
        stroke: textColor,
        strokeWidth: 3,
        originX: 'center',
        originY: 'center',
    });
    canvas.add(line1);

    // let line2 = new fabric.Line([window.innerWidth / 2 - radius / Math.sqrt(2), window.innerHeight / 2 - radius + circleStroke / 2, window.innerWidth / 2 + radius / Math.sqrt(2), window.innerHeight / 2 + radius - circleStroke / 2 ], {
    //     stroke: textColor,
    //     strokeWidth: 3,
    //     originX: 'center',
    //     originY: 'center',
    // });
    // canvas.add(line2);

    let line3 = new fabric.Line([window.innerWidth / 2 - radius + circleStroke / 2, window.innerHeight / 2, window.innerWidth / 2 + radius - circleStroke / 2, window.innerHeight / 2], {
        stroke: textColor,
        strokeWidth: 3,
        originX: 'center',
        originY: 'center',
    });
    canvas.add(line3);

    canvas.renderAll();

    let svg = canvas.toSVG();
    $('#svg-panel').html(svg);
}