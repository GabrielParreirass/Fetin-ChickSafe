export const createMqttOptions = () => {
  return {
    clientId: "chicksafe_" + Math.random().toString(16).substring(2, 8),
    username: "csilab",
    password: "WhoAmI#2024",
  };
};