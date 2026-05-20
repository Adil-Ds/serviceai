import React, { useRef, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { View, Text, StyleSheet, Animated, Pressable } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { ThemeProvider, useTheme } from "./src/contexts/ThemeContext";
import { COLORS, FONTS, RADIUS, SHADOWS } from "./src/constants/theme";

// Auth Screens
import SplashScreen from "./src/screens/auth/SplashScreen";
import WelcomeScreen from "./src/screens/auth/WelcomeScreen";
import LoginScreen from "./src/screens/auth/LoginScreen";
import RegisterScreen from "./src/screens/auth/RegisterScreen";

// User Screens
import UserDashboard from "./src/screens/user/UserDashboard";
import SearchScreen from "./src/screens/user/SearchScreen";
import ReasoningScreen from "./src/screens/user/ReasoningScreen";
import ResultsScreen from "./src/screens/user/ResultsScreen";
import BookingScreen from "./src/screens/user/BookingScreen";
import ConfirmationScreen from "./src/screens/user/ConfirmationScreen";
import BookingHistoryScreen from "./src/screens/user/BookingHistoryScreen";
import ProfileScreen from "./src/screens/user/ProfileScreen";
import NotificationsScreen from "./src/screens/user/NotificationsScreen";
import LanguageScreen from "./src/screens/user/LanguageScreen";
import AppearanceScreen from "./src/screens/user/AppearanceScreen";
import HelpSupportScreen from "./src/screens/user/HelpSupportScreen";
import LiveSearchScreen from "./src/screens/user/LiveSearchScreen";
import DeepSearchScreen from "./src/screens/user/DeepSearchScreen";

// Provider Screens
import ProviderDashboard from "./src/screens/provider/ProviderDashboard";
import BookingRequestsScreen from "./src/screens/provider/BookingRequestsScreen";
import ProviderProfileScreen from "./src/screens/provider/ProviderProfileScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ── Animated Tab Icon ────────────────────────────────────────────────────────
function TabIcon({ name, focused, color, label }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.15 : 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={[styles.tabIconWrap, { transform: [{ scale }] }]}>
      <Ionicons name={name} size={22} color={color} />
      {focused && <View style={[styles.tabDot, { backgroundColor: color }]} />}
    </Animated.View>
  );
}

// ── Custom Tab Bar ───────────────────────────────────────────────────────────
function CustomTabBar({ state, descriptors, navigation }) {
  const { colors: C } = useTheme();
  return (
    <View style={[styles.tabBar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.tabItem}>
            {options.tabBarIcon({ focused: isFocused, color: isFocused ? C.primary : C.textMuted })}
            <Text style={[styles.tabLabel, { color: isFocused ? C.primary : C.textMuted }]}>
              {options.title || route.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── User Tabs ────────────────────────────────────────────────────────────────
function UserTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="Home"
        component={UserDashboard}
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? "home" : "home-outline"} focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="BookingHistory"
        component={BookingHistoryScreen}
        options={{
          title: "Bookings",
          tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? "receipt" : "receipt-outline"} focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? "person-circle" : "person-circle-outline"} focused={focused} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ── Provider Tabs ────────────────────────────────────────────────────────────
function ProviderTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="Dashboard"
        component={ProviderDashboard}
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? "grid" : "grid-outline"} focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="BookingRequests"
        component={BookingRequestsScreen}
        options={{
          title: "Requests",
          tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? "calendar" : "calendar-outline"} focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProviderProfile"
        component={ProviderProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? "person-circle" : "person-circle-outline"} focused={focused} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ── Root Navigator ───────────────────────────────────────────────────────────
function RootNavigator() {
  const { user, userProfile, loading } = useAuth();
  const { colors: C } = useTheme();

  if (loading) return <SplashScreen />;

  const isProvider = userProfile?.role === "provider";

  const commonHeaderStyle = {
    headerStyle: { backgroundColor: C.surface },
    headerTintColor: C.text,
    headerTitleStyle: { ...FONTS.semiBold, fontSize: 16 },
    contentStyle: { backgroundColor: C.bg },
    headerShadowVisible: false,
    animation: "slide_from_right",
    headerBackTitle: "",
  };

  return (
    <Stack.Navigator screenOptions={commonHeaderStyle}>
      {!user ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false, animation: "fade" }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        </>
      ) : isProvider ? (
        <Stack.Screen name="ProviderTabs" component={ProviderTabs} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="UserTabs" component={UserTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Search" component={SearchScreen} options={{ title: "Find a Service" }} />
          <Stack.Screen name="Reasoning" component={ReasoningScreen} options={{ title: "AI Agents" }} />
          <Stack.Screen name="Results" component={ResultsScreen} options={{ title: "Top Matches" }} />
          <Stack.Screen name="Booking" component={BookingScreen} options={{ title: "Confirm Booking" }} />
          <Stack.Screen
            name="Confirmation"
            component={ConfirmationScreen}
            options={{ title: "Booking Confirmed", gestureEnabled: false }}
          />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notifications" }} />
          <Stack.Screen name="Language"      component={LanguageScreen}      options={{ title: "Language" }} />
          <Stack.Screen name="Appearance"    component={AppearanceScreen}    options={{ title: "Appearance" }} />
          <Stack.Screen name="HelpSupport"   component={HelpSupportScreen}   options={{ title: "Help & Support" }} />
          <Stack.Screen name="LiveSearch"    component={LiveSearchScreen}    options={{ headerShown: false }} />
          <Stack.Screen name="DeepSearch"   component={DeepSearchScreen}   options={{ headerShown: false }} />
        </>
      )}
    </Stack.Navigator>
  );
}

// ── Inner app — needs ThemeContext already mounted ────────────────────────────
function ThemedApp() {
  const { navTheme, isDark } = useTheme();
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={navTheme.colors.card} />
      <RootNavigator />
    </NavigationContainer>
  );
}

// ── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedApp />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: 24,
    paddingTop: 10,
    paddingHorizontal: 8,
    ...SHADOWS.md,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  tabIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
  },
  tabDot: {
    position: "absolute",
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  tabLabel: {
    fontSize: 10,
    ...FONTS.medium,
  },
});
