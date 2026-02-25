
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

// Beautiful color palette for Lara's task app - soft, elegant, and feminine
export const colors = {
  primary: '#E91E63',      // Pink - main accent
  secondary: '#F06292',    // Light Pink
  accent: '#FF4081',       // Bright Pink
  background: '#FFF5F7',   // Very light pink background
  backgroundAlt: '#FFFFFF', // White for cards
  text: '#2D2D2D',         // Dark grey for text
  textSecondary: '#757575', // Medium grey for secondary text
  grey: '#E0E0E0',         // Light grey for borders
  card: '#FFFFFF',         // White cards
  highlight: '#FFF0F5',    // Very light pink highlight
  success: '#4CAF50',      // Green for completed tasks
  warning: '#FF9800',      // Orange for high priority
  low: '#9C27B0',          // Purple for low priority
  medium: '#2196F3',       // Blue for medium priority
  high: '#FF5722',         // Red-orange for high priority
};

export const buttonStyles = StyleSheet.create({
  instructionsButton: {
    backgroundColor: colors.primary,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    backgroundColor: colors.backgroundAlt,
    alignSelf: 'center',
    width: '100%',
  },
});

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 800,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.text,
    marginBottom: 10
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 24,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.grey,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    width: '100%',
    boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  icon: {
    width: 60,
    height: 60,
    tintColor: "white",
  },
});
