import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function projectIdExpo(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId
  );
}

export async function registrarPush(): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "ChickSafe",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#f9ca0a",
    });
  }

  const atual = await Notifications.getPermissionsAsync();
  let status = atual.status;
  if (status !== "granted") {
    const pedido = await Notifications.requestPermissionsAsync();
    status = pedido.status;
  }
  if (status !== "granted") {
    return null;
  }

  const projectId = projectIdExpo();
  if (!projectId) {
    console.warn(
      "Push: extra.eas.projectId ausente. Rode npx eas-cli init e cole o UUID no app.json."
    );
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}
