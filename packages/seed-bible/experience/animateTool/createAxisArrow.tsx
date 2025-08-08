const dim = os.getCurrentDimension();

const axisArrowConfig = create({
    space: "tempLocal",
    [dim]: true,
    formOpacity: 0,
    axisArrow: true,
    scale: 1,
    [dim + "RotationZ"]: Math.PI,
    form: "mesh",
    formSubtype: "gltf",
    formAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/3c562f6af37bd16f378036a72fad87945287296a30fea64209f291a74c3d23a5.xml",
    draggable: false,
    pointable: false
});

create({
    space: "tempLocal",
    [dim]: true,
    formOpacity: 0,
    circle: true,
    scale: 1,
    form: "circle",
    draggable: false,
    pointable: false,
    color: "white"
});

console.log("created both")