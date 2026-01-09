// ✅ Location structure with PS + Markets under each District
export type LocationData = {
  [city: string]: {
    districts: {
      [district: string]: {
        ps: string[];
        markets: string[];
      };
    };
  };
};

export const locationData: LocationData = {
  karachi: {
    districts: {
      karachi_central: {
        ps: [
          "Civil Lines",
          "Risala",
          "Nabi Bux",
          "City Court",
          "Chakiwara",
          "Kalakot",
          "Eidgah",
          "Napier",
          "Mithadar"
        ],
        markets: ["Saddar Mobile Market", "Shahjahan Market Mobile Shops", "Abdullah Haroon Road Mobile Market"],
      },
      karachi_east: {
        ps: [
          "Shahrah‑e‑Faisal",
          "Bahadurabad",
          "Baloch Colony",
          "Brigade",
          "CDGK",
          "Ferozabad",
          "Gulistan‑e‑Johar",
          "Gulshan‑e‑Iqbal"
        ],
        markets: ["Gulshan Mobile Market", "Bahadurabad Phone Shops"],
      },
      karachi_south: {
        ps: [
          "Saddar",
          "Clifton",
          "Boat Basin",
          "Preedy",
          "Frere",
          "Defence",
          "Sahil",
          "Women Police Station (South)",
          "Gizri"
        ],
        markets: ["Saddar Mobile Market", "Star City Mall Mobile Shops"],
      },
      karachi_west: {
        ps: [
          "Peerabad",
          "Surjani",
          "Manghopir",
          "Pakistan Bazar",
          "Orangi Town",
          "Mominabad",
          "Iqbal Market",
          "Gulshan‑e‑Maymar"
        ],
        markets: ["Surjani Town Mobile Shops", "Orangi Mobile Market"],
      },
      korangi: {
        ps: [
          "Korangi",
          "Landhi",
          "Model Colony",
          "Korangi Industrial Area",
          "Awami Colony",
          "Al‑Falah",
          "Khokhrapar",
          "Zaman Town",
          "Shah Faisal"
        ],
        markets: ["Korangi Mobile Market", "Landhi Phone Shops"],
      },
      malir: {
        ps: [
          "Steel Town",
          "Sukhan",
          "Sharafi Goth",
          "Malir City",
          "Mehmoodabad",
          "Memon Goth"
        ],
        markets: ["Malir Mobile Market", "Memon Goth Phone Shops"],
      },
    },
  },

  hyderabad: {
    districts: {
      hyderabad_city: {
        ps: [
          "City Police Station Hyderabad",
          "Fort Police Station",
          "Sakhi Pir Police Station",
          "Hali Road Police Station",
          "Makki Shah Police Station",
          "Hussainabad Police Station"
        ],
        markets: ["Shahi Bazaar Mobile Shops", "Mobile Market Tower (Auto Bhan Road)", "SRTC Mobile Market"],
      },
      latifabad: {
        ps: [
          "Latifabad Police Station",
          "Traffic Latifabad",
          "Traffic Market"
        ],
        markets: ["Latifabad Mobile Shops", "Unit 7 Mobile Market"],
      },
      qasimabad: {
        ps: ["Qasimabad Police Station", "Traffic Qasimabad"],
        markets: ["Qasimabad Mobile Market"],
      },
    },
  },

  nawabshah: {
    districts: {
      shaheed_benazirabad: {
        ps: [
          "Nawabshah City Police Station",
          "A Section Police Station",
          "Sakrand Police Station",
          "Daulatpur Police Station",
          "Kazi Ahmed Police Station"
        ],
        markets: ["Yasir Mobile Shop Area", "Raja Communications Mobile Shops", "Mobile Bazaar Nawabshah"],
      },
    },
  },

  sukkur: {
    districts: {
      sukkur_city: {
        ps: ["Sukkur City Police Station", "A Section Sukkur", "B Section Sukkur", "Airport Sukkur"],
        markets: ["Main Bazaar Sukkur", "Mobile Market Clock Tower"],
      },
      rohri: {
        ps: ["Rohri Police Station", "Pano Aqil Police Station"],
        markets: ["Rohri Mobile Bazaar"],
      },
    },
  },

  larkana: {
    districts: {
      larkana_city: {
        ps: ["Larkana City Police Station", "Sachal Police Station", "Rato Dero Police Station"],
        markets: ["Larkana Mobile Market", "Jinnah Bagh Road Mobile Shops"],
      },
    },
  },

  mirpurkhas: {
    districts: {
      mirpurkhas_city: {
        ps: ["Mirpurkhas City Police Station", "Satellite Town Police Station"],
        markets: ["Mirpurkhas Mobile Market", "Main Bazaar Mobile Shops"],
      },
    },
  },

  jacobabad: {
    districts: {
      jacobabad_city: {
        ps: ["Jacobabad City Police Station", "Civil Lines Police Station"],
        markets: ["Jacobabad Mobile Bazaar"],
      },
    },
  },

  shikarpur: {
    districts: {
      shikarpur_city: {
        ps: ["Shikarpur City Police Station", "New Phulji Police Station"],
        markets: ["Shikarpur Mobile Market"],
      },
    },
  },

  khairpur: {
    districts: {
      khairpur_city: {
        ps: ["Khairpur City Police Station", "Gambat Police Station"],
        markets: ["Khairpur Mobile Bazaar"],
      },
    },
  },

  dadu: {
    districts: {
      dadu_city: {
        ps: ["Dadu City Police Station", "Mehar Police Station"],
        markets: ["Dadu Mobile Market"],
      },
    },
  },

  badin: {
    districts: {
      badin_city: {
        ps: ["Badin City Police Station", "Talhar Police Station"],
        markets: ["Badin Mobile Bazaar"],
      },
    },
  },

  thatta: {
    districts: {
      thatta_city: {
        ps: ["Thatta City Police Station", "Makli Police Station"],
        markets: ["Makli Mobile Market"],
      },
    },
  },

  umarkot: {
    districts: {
      umarkot_city: {
        ps: ["Umarkot City Police Station"],
        markets: ["Umarkot Mobile Bazaar"],
      },
    },
  },

  tharparkar: {
    districts: {
      mithi: {
        ps: ["Mithi City Police Station"],
        markets: ["Mithi Mobile Market"],
      },
    },
  },

  sanghar: {
    districts: {
      sanghar_city: {
        ps: ["Sanghar City Police Station", "Shahdadpur Police Station"],
        markets: ["Sanghar Mobile Market"],
      },
    },
  },

  ghotki: {
    districts: {
      ghotki_city: {
        ps: ["Ghotki City Police Station", "Mirpur Mathelo Police Station"],
        markets: ["Ghotki Mobile Bazaar"],
      },
    },
  },

  kashmore: {
    districts: {
      kandhkot: {
        ps: ["Kandhkot Police Station"],
        markets: ["Kandhkot Mobile Market"],
      },
    },
  },

  matiari: {
    districts: {
      matiari_city: {
        ps: [
          "Police Station Bhitshah",
          "Hala Police Station",
          "Hala Old Police Station",
          "PS Matiari",
          "Shahpur Darpur Police Station",
          "Odero Lal Police Station",
          "Bhanoth Police Station",
          "Sekhat Police Station"
        ],
        markets: ["Matiari Mobile Bazaar"],
      },
    },
  },

  tando_allahyar: {
    districts: {
      tando_allahyar_city: {
        ps: ["Tando Allahyar Police Station"],
        markets: ["Tando Allahyar Mobile Market"],
      },
    },
  },

  tando_muhammad_khan: {
    districts: {
      tmk_city: {
        ps: ["Tando Muhammad Khan Police Station"],
        markets: ["TMK Mobile Bazaar"],
      },
    },
  },
};
