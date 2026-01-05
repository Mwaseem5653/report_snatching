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
      korangi: {
        ps: ["PS1", "PS2"],
        markets: ["Korangi Bazar", "Brookes Chowrangi Market"],
      },
      south: {
        ps: ["PS3", "PS4"],
        markets: ["Saddar Market", "Clifton Market"],
      },
    },
  },
  lahore: {
    districts: {
      ravi: {
        ps: ["PS5", "PS6"],
        markets: ["Anarkali", "Ichra Bazar", "Liberty"],
      },
    },
  },
};
