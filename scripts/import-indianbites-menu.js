#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
);

const INDIANBITES_MENU = {
  "restaurant": "Indianbites",
  "menu": {
    "sections": [
      {
        "name": "Tillbehör",
        "items": [
          {
            "number": "1",
            "name": "RAITA",
            "spiciness": "🌶",
            "tags": [],
            "price": "29kr",
            "description": "Kryddig yoghurt med tomat och gurka"
          },
          {
            "number": "2",
            "name": "KACHUMBER",
            "spiciness": "🌶🌶",
            "tags": [],
            "price": "28kr",
            "description": "Traditionell indisk sallad med tärnad tomat, gurka, koriander och lökröra"
          },
          {
            "number": null,
            "name": "CHILLI PICKLES",
            "spiciness": "🌶🌶🌶🌶",
            "tags": ["V"],
            "price": "13kr",
            "description": ""
          },
          {
            "number": null,
            "name": "MANGO CHUTNEY",
            "spiciness": "🌶🌶",
            "tags": ["V"],
            "price": "13kr",
            "description": ""
          },
          {
            "number": null,
            "name": "GRÖN CHUTNEY",
            "spiciness": "🌶+",
            "tags": ["V"],
            "price": "13kr",
            "description": ""
          },
          {
            "number": null,
            "name": "TAMARIND CHUTNEY",
            "spiciness": "🌶+",
            "tags": ["V"],
            "price": "13kr",
            "description": ""
          },
          {
            "number": null,
            "name": "MYNTASÅS",
            "spiciness": "🌶",
            "tags": [],
            "price": "13kr",
            "description": ""
          },
          {
            "number": null,
            "name": "MIX PICKLES",
            "spiciness": "🌶🌶🌶🌶",
            "tags": ["V"],
            "price": "13kr",
            "description": ""
          },
          {
            "number": "4",
            "name": "EXTRA RIS",
            "spiciness": "",
            "tags": [],
            "price": "Liten 29kr & Stor 39kr",
            "description": ""
          },
          {
            "number": "5",
            "name": "MANGO LASSI",
            "spiciness": "",
            "tags": [],
            "price": "35kr",
            "description": "Yoghurtdrink med mangosmak"
          },
          {
            "number": "6",
            "name": "LÄSK (33 cl)",
            "spiciness": "",
            "tags": [],
            "price": "25kr",
            "description": "Cola, cola zero, Pepsi, Pepsi max, 7 up, loka natural, loka citron, Fanta orange, Fanta exotic"
          },
          {
            "number": "7",
            "name": "JUICE",
            "spiciness": "",
            "tags": [],
            "price": "20kr",
            "description": ""
          },
          {
            "number": "8",
            "name": "MASALA CHAI (Tea, Mjölk)",
            "spiciness": "",
            "tags": [],
            "price": "29kr",
            "description": ""
          },
          {
            "number": "20",
            "name": "PAPADOM (2ST.)",
            "spiciness": "",
            "tags": [],
            "price": "29kr",
            "description": "Krispiga och kryddiga linsbröd serveras med myntasås."
          }
        ]
      },
      {
        "name": "Naan/Roti",
        "items": [
          {
            "number": "9",
            "name": "PLAIN NAAN",
            "spiciness": "",
            "tags": ["V"],
            "price": "29kr",
            "description": "Naturellt naanbröd"
          },
          {
            "number": "10",
            "name": "BUTTER NAAN",
            "spiciness": "",
            "tags": [],
            "price": "32kr",
            "description": "Naanbröd med smör och svartkummin"
          },
          {
            "number": "11",
            "name": "VITLÖK&KORIANDER NAAN",
            "spiciness": "",
            "tags": ["V"],
            "price": "37kr",
            "description": "Naanbröd med vitlök och färsk koriander."
          },
          {
            "number": "12",
            "name": "OST & KORIANDER NAAN",
            "spiciness": "",
            "tags": [],
            "price": "49kr",
            "description": "Naanbröd med ost och färsk koriander"
          },
          {
            "number": "13",
            "name": "CHILLY CHEES NAAN",
            "spiciness": "🌶🌶",
            "tags": [],
            "price": "49kr",
            "description": ""
          },
          {
            "number": "14",
            "name": "CHILI NAAN",
            "spiciness": "🌶🌶🌶🌶",
            "tags": ["V"],
            "price": "39kr",
            "description": "Naanbröd med chili"
          },
          {
            "number": "15",
            "name": "ALOO KULCHA",
            "spiciness": "🌶🌶",
            "tags": ["IG"],
            "price": "49kr",
            "description": "Fyllt naanbröd med potatis, lök, färsk koriander och chili"
          },
          {
            "number": "16",
            "name": "PESHAWARI NAAN",
            "spiciness": "",
            "tags": ["IG", "IN"],
            "price": "49kr",
            "description": "Fyllt naanbröd med kokos, nötter och russin."
          },
          {
            "number": "17",
            "name": "CHAPATI",
            "spiciness": "",
            "tags": [],
            "price": "25kr",
            "description": "Indiskt bröd bakat på grovt mjöl (jäst-och laktosfritt)"
          },
          {
            "number": "18",
            "name": "PRANTHA",
            "spiciness": "",
            "tags": [],
            "price": "35kr",
            "description": "Pannstekt indiskt bröd"
          },
          {
            "number": "19",
            "name": "GLUTEN FRITT NAAN BRÖD",
            "spiciness": "",
            "tags": [],
            "price": "37kr",
            "description": ""
          }
        ]
      },
      {
        "name": "Förrätter",
        "items": [
          {
            "number": "21",
            "name": "LAMB SAMOSAS (1st)",
            "spiciness": "🌶🌶",
            "tags": ["IG"],
            "price": "72kr",
            "description": "Små piroger med lammfärsfyllning"
          },
          {
            "number": "22",
            "name": "PUNJABI SAMOSA Chat (2st)",
            "spiciness": "",
            "tags": [],
            "price": "89kr",
            "description": "Friterad pirog med kryddig grönsaksblandning, yoghurt & våra mustiga chutneys"
          },
          {
            "number": "23",
            "name": "PANI PURI",
            "spiciness": "",
            "tags": [],
            "price": "79kr",
            "description": "Mannagryn puffar med kryddig potatis & kikärtor, serveras med kryddigt örtvatten"
          },
          {
            "number": "24",
            "name": "FISH AMRITSARI",
            "spiciness": "",
            "tags": [],
            "price": "119kr",
            "description": "Panerad torsk på indiskt vis med husets coleslaw"
          },
          {
            "number": "25",
            "name": "PANEER TIKKA",
            "spiciness": "",
            "tags": [],
            "price": "89kr",
            "description": "Tandoori marinerad ost med lök, paprika & yoghurt"
          },
          {
            "number": "26",
            "name": "ONION BHAJI",
            "spiciness": "",
            "tags": [],
            "price": "89kr",
            "description": "Friterade bollar av lök, blomkål, potatis och kikärtsmjöl, serveras med tamarindchutney & myntasås"
          },
          {
            "number": "27",
            "name": "MASALA PAPAD",
            "spiciness": "",
            "tags": [],
            "price": "49kr",
            "description": "Linsmjöls chips med hackad lök, tomat, koriander och chili"
          }
        ]
      },
      {
        "name": "Vegetariskt",
        "items": [
          {
            "number": "28",
            "name": "PANEER JODHPURI",
            "spiciness": "🌶",
            "tags": ["IN", "T"],
            "price": "139kr",
            "description": "Hemlagad färskost i en mild currysås med cashewnötskräm, toppad med papadamflingor."
          },
          {
            "number": "29",
            "name": "MALAI KOFTA",
            "spiciness": "🌶",
            "tags": ["IN"],
            "price": "139kr",
            "description": "Hemlagade grönsaksbollar med indisk färskost och krämig kardemumma- och saffransås"
          },
          {
            "number": "30",
            "name": "PALAK PANEER",
            "spiciness": "🌶🌶",
            "tags": ["T"],
            "price": "139kr",
            "description": "Hemlagad färskost tillagad i stuvad spenat, ingefära, chili och vitlök"
          },
          {
            "number": "31",
            "name": "PANEER BUTTER MASALA",
            "spiciness": "",
            "tags": [],
            "price": "139kr",
            "description": "Hemlagad ost, krämig cashewnöt och tomat sås"
          },
          {
            "number": "32",
            "name": "PANEER TIKKA MASALA",
            "spiciness": "",
            "tags": [],
            "price": "139kr",
            "description": "Marinerade hemlagad ost i tikka masala sås med kokosmjölk och kryddor"
          },
          {
            "number": "33",
            "name": "SHAHI PANEER",
            "spiciness": "",
            "tags": [],
            "price": "139kr",
            "description": "Hemlagad ost i en mild sås med mandel och cashewnötter"
          },
          {
            "number": "34",
            "name": "CHILLI PANEER",
            "spiciness": "",
            "tags": [],
            "price": "139kr",
            "description": "Marinerad hemlagad ost, chilisås, ingefära, lök, chili och paprika"
          },
          {
            "number": "35",
            "name": "KHUMB MASALA",
            "spiciness": "",
            "tags": [],
            "price": "139kr",
            "description": "Färska champinjoner, ingefära, ärtor och krämig sås"
          },
          {
            "number": "36",
            "name": "DAL MAKHANI",
            "spiciness": "",
            "tags": [],
            "price": "139kr",
            "description": "Svarta linser i långkok med vitlök, ingefära och kryddor"
          },
          {
            "number": "37",
            "name": "KADAHI PANEER",
            "spiciness": "",
            "tags": [],
            "price": "139kr",
            "description": "Paprika, lök, vanlig sås med hemlagad ost"
          },
          {
            "number": "38",
            "name": "KADAHI PAKORA",
            "spiciness": "",
            "tags": [],
            "price": "135kr",
            "description": "Linsmjöls gryta med yoghurt, kryddor och pakoras (vegetarisk bullar)"
          },
          {
            "number": "42",
            "name": "ALOO GHOBI",
            "spiciness": "🌶🌶",
            "tags": ["V"],
            "price": "135kr",
            "description": "Potatis- och blomkålsgryta med lök och tomatmasala, smaksatt med färsk ingefära"
          },
          {
            "number": "43",
            "name": "MIX VEG",
            "spiciness": "",
            "tags": ["V"],
            "price": "139kr",
            "description": "Grönsaksgryta i krämig sås med mandel och cashewnötter, samt blomkål- och potatisgryta med tomat, ingefära och garam masala"
          },
          {
            "number": "44",
            "name": "PALAK CHANA",
            "spiciness": "🌶🌶",
            "tags": ["V"],
            "price": "139kr",
            "description": "Spenat med kikärtor, lök, tomat, garam masala, chili och ingefära."
          },
          {
            "number": "45",
            "name": "PALAK KOFTA",
            "spiciness": "🌶",
            "tags": ["V"],
            "price": "139kr",
            "description": "En klassisk nordindisk rätt med stekta hemlagade spenatbollar i lök- och tomatbaserad kryddsås."
          },
          {
            "number": "46",
            "name": "TARKA DAL",
            "spiciness": "",
            "tags": ["V"],
            "price": "135kr",
            "description": "Gula linser på indiskt sätt"
          },
          {
            "number": "47",
            "name": "TOFU",
            "spiciness": "",
            "tags": ["V"],
            "price": "139kr",
            "description": ""
          },
          {
            "number": "48",
            "name": "CHANA MASALA",
            "spiciness": "",
            "tags": ["V"],
            "price": "135kr",
            "description": "Kikärtor, tomat, ingefära, curry sås, och garam masala"
          },
          {
            "number": "49",
            "name": "BEGAN MIRCH MASALA",
            "spiciness": "",
            "tags": ["V"],
            "price": "139kr",
            "description": "Aubergine med lök"
          }
        ]
      },
      {
        "name": "Special",
        "items": [
          {
            "number": "39",
            "name": "SPECIAL VEG THALI",
            "spiciness": "",
            "tags": [],
            "price": "190kr",
            "description": "4 veg rättor, Raita, pappad, Gulab jamun, Sallad, Rice och nan bröd"
          },
          {
            "number": "40",
            "name": "NON VEG THALI",
            "spiciness": "",
            "tags": [],
            "price": "220kr",
            "description": "2 veg, 1 chicken 1 lamm, 1 räkor, Raita, rice och naan bröd"
          },
          {
            "number": "41",
            "name": "BHATURE CHANA",
            "spiciness": "",
            "tags": [],
            "price": "130kr",
            "description": "2st Bhature, chane, raita, mint souce, onion"
          }
        ]
      },
      {
        "name": "Kyckling",
        "items": [
          {
            "number": "50",
            "name": "CHICKEN TIKKA MASALA",
            "spiciness": "🌶",
            "tags": ["Q", "P"],
            "price": "159kr",
            "description": "Grillad, marinerad kycklingfilé i en mild sås av grädde, spiskummin, mynta och kokos."
          },
          {
            "number": "51",
            "name": "BUTTER CHICKEN",
            "spiciness": "🌶",
            "tags": ["Q", "P", "IN"],
            "price": "159kr",
            "description": "Grillad kycklingfilé i krämig cashewnötsås. Toppad med cashewnötter och russin"
          },
          {
            "number": "52",
            "name": "CHICKEN KORMA",
            "spiciness": "🌶",
            "tags": ["Q", "P", "IN"],
            "price": "159kr",
            "description": "Krämig kycklingfilégryta med malda pistage och cashewnötter"
          },
          {
            "number": "53",
            "name": "HYDERABADI MURG",
            "spiciness": "🌶🌶+",
            "tags": ["LF"],
            "price": "159kr",
            "description": "Örtkryddad kycklingfilégryta med färsk koriander, mynta och grön chili i kokosmjölk."
          },
          {
            "number": "54",
            "name": "MALVANI CHICKEN",
            "spiciness": "🌶🌶🌶",
            "tags": ["LF"],
            "price": "159kr",
            "description": "Kycklingfilé i en sås på kokoskräm, röd chili och garam masala"
          },
          {
            "number": "55",
            "name": "MURG MADRASI",
            "spiciness": "🌶🌶🌶",
            "tags": ["Q", "LF"],
            "price": "159kr",
            "description": "Kycklingfilé tillagad i en stark tamarind och kokossås, smaksatt med färska curryblad och koriander."
          },
          {
            "number": "56",
            "name": "CHICKEN VINDALOO",
            "spiciness": "",
            "tags": [],
            "price": "159kr",
            "description": "Kycklingfiléer, starka sydindiska kryddor, grön chili, ingefära, tamarind, rödvinssås."
          },
          {
            "number": "57",
            "name": "PALAK CHICKEN",
            "spiciness": "",
            "tags": [],
            "price": "159kr",
            "description": "Spenat med kyckling"
          },
          {
            "number": "58",
            "name": "CHICKEN KADAHI",
            "spiciness": "",
            "tags": [],
            "price": "159kr",
            "description": "Paprika, lök, tomat sås"
          },
          {
            "number": "59",
            "name": "CHILLY CHICKEN",
            "spiciness": "",
            "tags": [],
            "price": "159kr",
            "description": "Stark sås, paprika, lök chilli sås"
          },
          {
            "number": "60",
            "name": "CHICKEN ZALFREJI",
            "spiciness": "",
            "tags": [],
            "price": "159kr",
            "description": "Garam masala, vitlök, lök"
          }
        ]
      },
      {
        "name": "Fisk",
        "items": [
          {
            "number": "61",
            "name": "FISH MOILEE",
            "spiciness": "🌶🌶",
            "tags": ["LF"],
            "price": "169kr",
            "description": "Laxfilé med senapsfrön, curryblad, rödlök, ingefära, gurkmeja, bockhorn tomat och färsk koriander."
          },
          {
            "number": "62",
            "name": "JHINGA LAHSUNI NIMBU",
            "spiciness": "",
            "tags": ["LF", "F"],
            "price": "169kr",
            "description": "Vitlöksbräserade tigerräkor, tillagade i en krämig masalasås med smak av lime"
          },
          {
            "number": "63",
            "name": "JHINGA GOAN CURRY",
            "spiciness": "🌶🌶",
            "tags": ["LF", "F"],
            "price": "169kr",
            "description": "Tigerräkor i en väldoftande kokosmjölksgryta med vitlök, svarta senapsfrön, koriander, tamarind och curryblad."
          },
          {
            "number": "64",
            "name": "JHINGA LAZIZ",
            "spiciness": "🌶🌶",
            "tags": ["LF"],
            "price": "169kr",
            "description": "Tigerräkor bräserade i lök, vitlök, tomat, ingefära och chili"
          },
          {
            "number": "65",
            "name": "MACHLI BENGALI",
            "spiciness": "🌶🌶🌶",
            "tags": ["LF"],
            "price": "169kr",
            "description": "Laxfilé med grön chili och tamarind, tillagad i kokosmjölk, kryddad med färsk koriander"
          },
          {
            "number": "66",
            "name": "PRAWN JAHANGIRI",
            "spiciness": "",
            "tags": [],
            "price": "169kr",
            "description": "Tigerräkor, spenat, tomat, ingefära och färska rostade kryddor"
          },
          {
            "number": "67",
            "name": "GOAN FISH CURRY",
            "spiciness": "",
            "tags": [],
            "price": "169kr",
            "description": "Fjordlax med senap samt chili- och kokosmjölkssås"
          },
          {
            "number": "68",
            "name": "PRAWN CHILLY",
            "spiciness": "",
            "tags": [],
            "price": "163kr",
            "description": "Paprika, lök, vitlök med stark sås"
          }
        ]
      },
      {
        "name": "Lamm",
        "items": [
          {
            "number": "69",
            "name": "SHAHI GOSHT",
            "spiciness": "🌶",
            "tags": ["IN"],
            "price": "172kr",
            "description": "Mild och krämig lammrätt med kardemumma, malda cashewnötter och pistagenötter."
          },
          {
            "number": "70",
            "name": "ROGAN JOSH",
            "spiciness": "🌶",
            "tags": ["LF", "IN"],
            "price": "172kr",
            "description": "Klassisk nordindisk lammrätt med smak av saffran och kardemumma, garnerad med mandel."
          },
          {
            "number": "71",
            "name": "LAMB SAAG",
            "spiciness": "🌶🌶",
            "tags": ["LF"],
            "price": "172kr",
            "description": "Lammrätt från Punjab, med spenat, tomat, rödlök och grönchili."
          },
          {
            "number": "72",
            "name": "LAMB PUNJABI CURRY",
            "spiciness": "🌶🌶",
            "tags": ["LF"],
            "price": "172kr",
            "description": "En popular lammrätt i en sås av lök, tomat, paprika, ingefära, koriander & grön chili."
          },
          {
            "number": "73",
            "name": "GOAN LAMB CURRY",
            "spiciness": "🌶🌶",
            "tags": ["LF"],
            "price": "172kr",
            "description": "Lammrätt från Goa tillagad med curryblad i en kokosmasalasås"
          },
          {
            "number": "74",
            "name": "ACHARI MIRCH GOSHT",
            "spiciness": "🌶🌶🌶",
            "tags": ["LF"],
            "price": "172kr",
            "description": "Lammrätt med röd chili, limeblad, färsk ingefära, chili pickles, mynta och kokosmjölk"
          },
          {
            "number": "75",
            "name": "LAMB VINDALOO",
            "spiciness": "🌶🌶🌶+",
            "tags": ["LF"],
            "price": "172kr",
            "description": "Eldig lammrätt från Goa med palmvinäger, nejlikor och piri-piri masala"
          }
        ]
      },
      {
        "name": "Tandoori",
        "items": [
          {
            "number": "76",
            "name": "CHICKEN TANDOORI",
            "spiciness": "🌶+",
            "tags": [],
            "price": "159kr",
            "description": "Grillade kycklingklubbor marinerade i lime, yoghurt och tandoorimasala"
          },
          {
            "number": "77",
            "name": "CHICKEN TIKKA",
            "spiciness": "🌶+",
            "tags": [],
            "price": "165kr",
            "description": "Kycklingfilé marinerad i lime, yoghurt och tandoorimasala."
          },
          {
            "number": "78",
            "name": "GARLIC CHICKEN TIKKA",
            "spiciness": "🌶+",
            "tags": [],
            "price": "165kr",
            "description": "Kycklingfilé marinerad i vitlök, ingefära, grön chili, yoghurt och lime"
          },
          {
            "number": "79",
            "name": "SEEKH KEBAB",
            "spiciness": "🌶🌶",
            "tags": ["LF"],
            "price": "172kr",
            "description": "Lammfärskebab med ingefära, vitlök, ägg. garam masala, tomat och färsk koriander"
          },
          {
            "number": "80",
            "name": "PANEER TIKKA LAZAWAB",
            "spiciness": "🌶🌶",
            "tags": [],
            "price": "157kr",
            "description": "Marinerad grillad indisk färskost med paprika och tomat."
          },
          {
            "number": "81",
            "name": "TANDOORI MIXED GRILL",
            "spiciness": "🌶🌶",
            "tags": [],
            "price": "183kr",
            "description": "Marinerad lammfärskebab, indisk färskost, kyckling marinerad i vitlök & örter, kyckling marinerad i tandoori och tigerräkor."
          },
          {
            "number": "82",
            "name": "PRAWN TANDOORI (8st)",
            "spiciness": "",
            "tags": [],
            "price": "199kr",
            "description": "Tandoori marinerade tigerräkor (odlade) med lime, yoghurt och kokos"
          },
          {
            "number": "83",
            "name": "BOTI KEBAB",
            "spiciness": "",
            "tags": [],
            "price": "172kr",
            "description": "Köttbitar av lamm marinerade med papaya, mynta, lime, yoghurt och spiskummin"
          }
        ]
      },
      {
        "name": "Biryani",
        "items": [
          {
            "number": "A",
            "name": "CHICKEN BIRYANI",
            "spiciness": "🌶🌶🌶",
            "tags": [],
            "price": "189kr",
            "description": "Långkokt saffransris med en rik smak av indiska kryddor och kryddsmör. Serveras med raita."
          },
          {
            "number": "B",
            "name": "LAMB BIRYANI",
            "spiciness": "🌶🌶🌶",
            "tags": [],
            "price": "199kr",
            "description": "Långkokt saffransris med en rik smak av indiska kryddor och kryddsmör. Serveras med raita."
          },
          {
            "number": "C",
            "name": "VEG BIRYANI",
            "spiciness": "🌶🌶🌶",
            "tags": [],
            "price": "179kr",
            "description": "Långkokt saffransris med en rik smak av indiska kryddor och kryddsmör. Serveras med raita."
          }
        ]
      },
      {
        "name": "Dessert",
        "items": [
          {
            "number": "85",
            "name": "GAJRELLA",
            "spiciness": "",
            "tags": ["IN"],
            "price": "59kr",
            "description": "(rekommenderas att avnjutas med glass) Husets morotsdessert, smaksatt med nötter och kardemumma."
          },
          {
            "number": "86",
            "name": "PISTA KULFI",
            "spiciness": "",
            "tags": ["IN"],
            "price": "59kr",
            "description": "Indisk hemmagjord glass med pistage"
          },
          {
            "number": "87",
            "name": "GULAB JAMUN",
            "spiciness": "",
            "tags": [],
            "price": "59kr",
            "description": "(1st) med vanilj glass (2st) utan vanilj glass"
          }
        ]
      },
      {
        "name": "Barnmeny",
        "items": [
          {
            "number": "88",
            "name": "CHICKEN TIKKA MASALA",
            "spiciness": "🌶",
            "tags": ["Q", "P"],
            "price": "99kr",
            "description": ""
          },
          {
            "number": "89",
            "name": "BUTTER CHICKEN",
            "spiciness": "🌶🌶",
            "tags": ["Q", "P", "IN"],
            "price": "99kr",
            "description": ""
          },
          {
            "number": "90",
            "name": "PALAK PANEER",
            "spiciness": "🌶🌶",
            "tags": ["T"],
            "price": "99kr",
            "description": ""
          },
          {
            "number": "91",
            "name": "CHICKEN TIKKA",
            "spiciness": "🌶+",
            "tags": [],
            "price": "99kr",
            "description": ""
          },
          {
            "number": "92",
            "name": "POMMES",
            "spiciness": "",
            "tags": ["V"],
            "price": "49kr",
            "description": ""
          },
          {
            "number": "93",
            "name": "VEGO-NUGGETS",
            "spiciness": "",
            "tags": ["V"],
            "price": "69kr",
            "description": ""
          },
          {
            "number": "94",
            "name": "CHICKEN NUGGETS (7PC)",
            "spiciness": "",
            "tags": [],
            "price": "69kr",
            "description": ""
          }
        ]
      }
    ]
  }
};

async function importMenu() {
  try {
    console.log('🍽️  Importing Indianbites Menu...');
    
    // First, create or get the restaurant
    const restaurantId = '64806e5b-714f-4388-a092-29feff9b64c0'; // Your existing restaurant ID
    
    console.log(`📍 Restaurant ID: ${restaurantId}`);
    
    let totalItems = 0;
    let importedItems = 0;
    
    // Import each section and its items
    for (const section of INDIANBITES_MENU.menu.sections) {
      console.log(`\n📋 Processing section: ${section.name}`);
      
      for (const item of section.items) {
        totalItems++;
        
        // Convert price from "159kr" to 15900 (cents)
        const priceMatch = item.price.match(/(\d+)/);
        const priceCents = priceMatch ? parseInt(priceMatch[1]) * 100 : null;
        
        // Convert tags to dietary info
        const dietary = item.tags.map(tag => {
          const tagMap = {
            'V': 'vegan',
            'LF': 'lactose-free',
            'IG': 'gluten-free',
            'IN': 'nuts',
            'Q': 'quorn',
            'P': 'paneer',
            'T': 'tofu',
            'F': 'fish'
          };
          return tagMap[tag] || tag;
        });
        
        // Create menu item
        const menuItem = {
          id: `indianbites-${item.number || Math.random().toString(36).substr(2, 9)}`,
          restaurant_id: restaurantId,
          name: item.name,
          description: item.description || null,
          price_cents: priceCents,
          currency: 'SEK',
          allergens: [],
          is_available: true,
          menu: 'indianbites',
          section_path: [section.name],
          dietary: dietary,
          item_number: item.number?.toString() || null,
          nutritional_info: {
            spiciness: item.spiciness,
            tags: item.tags,
            original_price: item.price
          }
        };
        
        try {
          const { data, error } = await supabase
            .from('menu_items')
            .upsert(menuItem, { onConflict: 'id' });
            
          if (error) {
            console.error(`❌ Error importing ${item.name}:`, error);
          } else {
            console.log(`✅ Imported: ${item.name} (${item.price})`);
            importedItems++;
          }
        } catch (err) {
          console.error(`❌ Failed to import ${item.name}:`, err);
        }
      }
    }
    
    console.log(`\n🎉 Import Complete!`);
    console.log(`📊 Total items: ${totalItems}`);
    console.log(`✅ Successfully imported: ${importedItems}`);
    console.log(`❌ Failed: ${totalItems - importedItems}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
  }
}

// Run the import
importMenu().catch(console.error);
