import "react-native-url-polyfill/auto";
import { registerRootComponent } from "expo";
import App from "./App";

// Register the background location task before the app mounts.
import "./src/lib/locationTask";

registerRootComponent(App);
