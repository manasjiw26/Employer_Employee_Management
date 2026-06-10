import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Users, CheckSquare, Calendar, Menu } from 'lucide-react-native';
import { Colors } from '../../src/theme/colors';

export default function EmployerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.background,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
          shadowColor: Colors.shadow,
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        },
        headerTitleStyle: {
          fontFamily: 'Outfit',
          fontWeight: '700',
          fontSize: 20,
          color: Colors.text,
        },
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          height: 66,
          paddingBottom: 10,
          paddingTop: 10,
          shadowColor: Colors.shadow,
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: 'Outfit',
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'TalentSphere Dashboard',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="directory"
        options={{
          title: 'Directory',
          headerTitle: 'Employee Directory',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          headerTitle: 'Manage Tasks',
          tabBarIcon: ({ color, size }) => <CheckSquare color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="leaves"
        options={{
          title: 'Leaves',
          headerTitle: 'Leave Requests',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Actions',
          headerTitle: 'Employer Actions',
          tabBarIcon: ({ color, size }) => <Menu color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          headerTitle: 'My Profile',
        }}
      />
    </Tabs>
  );
}
