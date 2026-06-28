export interface Cat {
  id: string;
  catNumber: number; // sequential number for #00001 display
  name: string;
  photoUri?: string;
  lat?: number;
  lng?: number;
  locationName?: string;
  spottedAt: string; // ISO date string
  spottedBy: string;
}

export interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
  is_live: boolean;
  last_location?: { lat: number; lng: number };
}

export type RootStackParamList = {
  Login: undefined;
  UsernameSetup: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Explore: undefined;
  Collection: undefined;
  Camera: undefined;
  Ranks: undefined;
  Profile: undefined;
};

export type CollectionStackParamList = {
  CollectionList: undefined;
  CatEdit: {
    cat: Cat;
    isNew?: boolean;
    selectedLocation?: { lat: number; lng: number; name: string };
  };
  MapPicker: { returnTo: 'CatEdit' };
  CatMap: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  About: undefined;
  EditProfile: undefined;
  CatMap: undefined;
};
