# Catventory

A React Native app where you spot real-world cats and collect them. Cat sightings are geotagged and appear on a shared map for all users.

## Stack

- React Native 0.86 (bare, Android)
- Supabase (auth, database, storage)
- Mapbox (maps, planned)

## Features

- Email + OTP login
- Camera with detection frame and save options
- Personal cat collection with photo, name, date and location
- Shared explore feed of recently spotted cats
- Leaderboard ranks
- Live mode for real-time location sharing

## Setup

1. Clone the repo
2. Run `npm install`
3. Add your Supabase credentials to `src/lib/supabase.ts`
4. Run the SQL in `supabase/schema.sql` in your Supabase dashboard
5. Connect an Android device and run `npx react-native run-android`

## Project Structure

```
src/
  screens/
    auth/       Login, UsernameSetup
    main/       Explore, Collection, Camera, CatEdit, MapPicker, Ranks, Profile
  navigation/   AppNavigator, MainTabNavigator, CollectionNavigator
  lib/          Supabase client
  types/        Shared TypeScript types
supabase/
  schema.sql    Database schema and RLS policies
```
