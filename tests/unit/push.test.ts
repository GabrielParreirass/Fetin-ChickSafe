import { projectIdExpo, registrarPush } from "@/lib/push";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

jest.mock("expo-constants", () => ({
  expoConfig: { extra: { eas: { projectId: "proj-teste" } } },
  easConfig: { projectId: "proj-teste" },
}));

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  AndroidImportance: { MAX: 5 },
}));

describe("projectIdExpo", () => {
  it("lê o UUID do app config", () => {
    expect(projectIdExpo()).toBe("proj-teste");
  });
});

describe("registrarPush", () => {
  const originalOs = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, "OS", { value: originalOs });
    jest.clearAllMocks();
  });

  it("não registra na web", async () => {
    Object.defineProperty(Platform, "OS", { value: "web" });
    await expect(registrarPush()).resolves.toBeNull();
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
  });

  it("devolve null quando a permissão é recusada", async () => {
    Object.defineProperty(Platform, "OS", { value: "android" });
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "denied",
    });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "denied",
    });

    await expect(registrarPush()).resolves.toBeNull();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it("cria o canal Android e devolve o token Expo", async () => {
    Object.defineProperty(Platform, "OS", { value: "android" });
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
      data: "ExponentPushToken[abc]",
    });

    await expect(registrarPush()).resolves.toBe("ExponentPushToken[abc]");
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      "default",
      expect.objectContaining({ name: "ChickSafe" })
    );
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: "proj-teste",
    });
  });
});
