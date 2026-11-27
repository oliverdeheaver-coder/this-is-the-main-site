// World data copied from the Roblox game "World Exploring Guildford" (x = east, z = south, 1 unit = 1 stud)
const WORLD = {
  size: 2048,
  spawn: [60, 20],
  avoid: [[-120, -285, 20, -190], [55, -255, 205, -145], [0, -120, 190, -45], [-45, 10, 45, 85], [220, -35, 440, 115], [-200, 20, -95, 100], [-770, -1024, -670, 1024], [-700, 470, -140, 650], [-510, 700, -390, 820], [-910, 480, -800, 720], [-80, 250, 520, 900], [0, -22, 120, 12], [-305, -330, -228, 430], [45, 30, 230, 90], [125, -22, 210, 12], [120, -470, 370, -340], [-300, -372, 700, -348], [-670, 140, -630, 180], [-540, 675, -500, 705], [-615, 660, -585, 715], [-145, 630, -115, 690], [-675, 775, -625, 825], [-680, 865, -640, 895], [-280, 910, -220, 970], [-625, 950, -575, 1000], [-405, 700, -385, 720], [-850, 290, -770, 370], [-840, 455, -800, 485], [-975, 305, -905, 380], [755, 280, 805, 360], [180, -60, 336, -36], [-50, -90, 10, -40], [-145, -100, -75, -40], [-85, -90, -35, -40], [-475, 495, -425, 535], [-425, 445, -375, 485], [-825, 595, -775, 645], [-250, 125, -205, 175], [-170, 450, -130, 490], [-175, -355, -125, -305], [355, -355, 405, -305], [455, -355, 505, -305], [-304, -85, -254, -35], [-304, 125, -254, 175], [-304, 335, -254, 385], [-255, -275, -205, -225], [-255, 305, -205, 355], [535, -85, 585, -35], [535, -5, 585, 45], [-825, 675, -775, 725], [-665, 445, -615, 495], [-565, 775, -515, 825], [630, 50, 730, 150], [-380, 475, -280, 575], [-270, 470, -170, 570], [-160, 270, -60, 370], [-350, 200, -250, 300], [-350, -200, -250, -100], [630, -300, 730, -200], [600, 550, 700, 650], [-1030, 750, -930, 850], [-1050, 400, -950, 500], [-860, 360, -740, 480]],
  ducks: [[-60,-230],[5,-230],[40,-80],[140,-90],[130,-200],[-20,40],[25,70],[330,40],[-150,60],[-80,150],[450,-30],[-380,600],[-720,600],[-420,760],[-820,200],[-720,300],[-705,160],[-868,640],[100,340],[300,700]],
  // topics: Explorer points (name, x, z)
  topics: [
    {key:"exercise", title:"💪 Exercise", color:"#e63c3c", spots:[["Guildford Spectrum",175,-378],["Guildford Lido",-70,-182],["Surrey Sports Park",-940,368],["Skatepark",-180,60],["Football Pitch",270,40],["Tennis Courts",130,-235],["Merrow Dojo",780,331]]},
    {key:"history",  title:"🏛️ History",  color:"#965adc", spots:[["Guildford Castle",-395,805],["Guildford Museum",-540,668],["Guildhall Clock",-405,602],["St Catherine's Chapel",-600,975],["Alice Statue",-412,700]]},
    {key:"nature",   title:"🌳 Nature",   color:"#3caa46", spots:[["Pewley Down",-262,928],["River Wey Towpath",-683,300],["Boating Pond",120,-50],["University Lake",-765,335],["Stag Hill Woods",-980,215]]},
    {key:"fun",      title:"🎭 Fun & Arts", color:"#f05ab4", spots:[["Yvonne Arnaud Theatre",-668,770],["G Live",140,345],["Helter Skelter",20,35],["Guildford Boat House",-640,900],["Guildford Station",-868,590]]}
  ],
  // name, x, z, facing (fx,fz), foods, colour of wall, colour of awning, staff name
  shops: [
    ["Stoke Park Kiosk",80,-52,0,1,["ice"],"#f5eedc","#d9534f"],
    ["Lorenzo's Cafe",-279,60,1,0,["breakfast","carbonara"],"#f0e6cf","#2f7d4f"],
    ["Guildford Market",-150,470,0,-1,["strawberries"],"#e8dcc0","#c0392b"],
    ["Guildford Bakery",-450,520,0,-1,["doughnut"],"#f5e1be","#aa6432"],
    ["Pizza Place",-400,470,0,-1,["pizza"],"#f0ebe1","#008c46"],
    ["Station Burger Bar",-800,620,1,0,["burger"],"#28282d","#e63228"],
    ["Mini Fish Bar",-230,150,-1,0,["fishchips"],"#e6f0fa","#1e5ab4"],
    ["The Tea Room",-150,-330,0,-1,["tea"],"#f0e1eb","#be5a8c"],
    ["Milkshake Bar",380,-330,0,-1,["milkshake"],"#fadce6","#f078aa"],
    ["Smoothie Bar",480,-330,0,-1,["smoothie"],"#e6fadc","#5abe50"],
    ["Coffee Corner",-279,-60,1,0,["coffee"],"#c8aa8c","#5a371e"],
    ["Sandwich Bar",-279,150,1,0,["sandwich"],"#f5f0dc","#3c8c3c"],
    ["Noodle Bar",-279,360,1,0,["noodles"],"#28282d","#dc2828"],
    ["Cookie Jar",-230,-250,-1,0,["cookie"],"#ebd7b9","#8c5a32"],
    ["Curry House",-230,330,-1,0,["curry"],"#f5c878","#c83c1e"],
    ["Cupcake Shop",560,-60,-1,0,["cupcake"],"#ffe1f0","#fa8cc8"],
    ["Brunch Club",560,20,-1,0,["eggs"],"#faf5e1","#fac83c"],
    ["Sushi Bar",-800,700,1,0,["sushi"],"#f5f5f0","#1e1e23"],
    ["Pie Shop",-640,470,0,-1,["sausageroll"],"#d7be96","#784628"],
    ["Italian Deli",-540,800,0,-1,["garlicbread"],"#f5f0e1","#008c46"]
  ],
  foods: {
    ice:["Ice Cream","🍦"], breakfast:["Full English Breakfast","🍳"], doughnut:["Doughnut","🍩"], pizza:["Pizza","🍕"], burger:["Burger","🍔"],
    fishchips:["Fish & Chips","🍟"], strawberries:["Strawberries","🍓"], tea:["Cup of Tea","🍵"], coffee:["Coffee","☕"], sandwich:["Sandwich","🥪"],
    noodles:["Noodles","🍜"], cookie:["Cookie","🍪"], curry:["Curry","🍛"], cupcake:["Cupcake","🧁"], eggs:["Eggs Benedict","🥚"],
    milkshake:["Milkshake","🥤"], smoothie:["Smoothie","🥤"], sushi:["Sushi","🍣"], sausageroll:["Sausage Roll","🥐"], garlicbread:["Garlic Bread","🥖"], carbonara:["Spaghetti Carbonara","🍝"]
  },
  // schools: name, x, z, facing, style colour, width
  schools: [
    ["Boxgrove Primary School",680,100,-1,0,"#e8c79a",44],["Guildford Institute",-330,525,0,-1,"#ebe4d2",36],["Royal Grammar School",-220,520,0,-1,"#f2eee4",40],
    ["Guildford High School",-110,320,1,0,"#d6dde6",44],["Sandfield Primary School",-300,250,1,0,"#e8c79a",44],["Guildford College",-300,-150,1,0,"#d6dde6",44],
    ["George Abbot School",680,-250,-1,0,"#d6dde6",44],["Tormead School",650,600,-1,0,"#a05040",44],["Guildford County School",-980,800,1,0,"#a05040",44],
    ["Christ's College",-1000,450,1,0,"#d6dde6",44],["University of Surrey",-800,420,0,-1,"#d6dde6",62]
  ],
  // sights for labels and the teleport list: name, x, z (label), arrive x, z
  sights: [
    ["Stoke Park (start)",60,20,60,20],["Guildford Spectrum",200,-420,200,-375],["Dapdune Wharf",-650,160,-625,160],["Guildford Museum",-520,690,-520,668],
    ["St Mary's Church",-600,690,-600,655],["Holy Trinity Church",-130,665,-130,632],["Yvonne Arnaud Theatre",-650,800,-650,772],["Guildford Boat House",-660,880,-635,880],
    ["Pewley Down",-250,940,-238,950],["St Catherine's Chapel",-600,975,-585,995],["Alice Through the Looking Glass",-395,712,-395,698],
    ["University of Surrey Campus",-810,330,-810,380],["Merrow Dojo",780,300,772,350],["BALM Clinic",-465,545,-482,515],
    ["Guildford Cathedral",-880,150,-830,190],["Guildford Castle",-450,760,-395,780],["Guildford Station",-870,600,-850,650],["High Street",-300,600,-315,600]
  ],
  roads: [ // x1,z1,x2,z2,width
    [0,200,-170,600,12],[-60,400,500,400,10],[-60,550,500,550,10],[-60,700,500,700,10],[-60,850,500,850,10],
    [-200,-30,500,-30,8],[-260,-320,-260,420,12],[-690,600,-150,600,24],[-300,-360,700,-360,12],[-482,480,-482,588,8],
    [-840,380,-780,380,6],[-300,60,-268,60,24],[120,-50,120,-30,6]
  ],
  track: {cx:250, cz:-140, R:55, W:12, studsPerKm:600},
  dojo: {x:780, z:300}
};
