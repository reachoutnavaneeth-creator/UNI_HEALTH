import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackedNavigator } from '@react-navigation/stack';

// Import the screens you and Member 2 worked on
import TokenDashboard from '../screens/TokenDashboard'; 
import EmergencyDashboard from '../screens/EmergencyDashboard'; 
// ... import other screens like Home, Login, etc.

const Stack = createStackedNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="TokenDashboard" // Or your preferred start screen
        screenOptions={{ headerShown: false }}
      >
        {/* Your Existing Screens */}
        {/* <Stack.Screen name="Home" component={HomeScreen} /> */}

        {/* The Token Control Screen (Your Code) */}
        <Stack.Screen 
          name="TokenDashboard" 
          component={TokenDashboard} 
        />

        {/* The Emergency Control Screen (Member 2's Converted Code) */}
        <Stack.Screen 
          name="EmergencyDashboard" 
          component={EmergencyDashboard} 
          options={{ 
            presentation: 'modal', // Makes it slide up like a control panel
            animationEnabled: true 
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}