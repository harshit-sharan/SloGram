import Profile from "../../pages/Profile";
import { ThemeProvider } from "../ThemeProvider";

export default function ProfileExample() {
  return (
    <ThemeProvider>
      <Profile />
    </ThemeProvider>
  );
}
