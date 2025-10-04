import Feed from "../../pages/Feed";
import { ThemeProvider } from "../ThemeProvider";

export default function FeedExample() {
  return (
    <ThemeProvider>
      <Feed />
    </ThemeProvider>
  );
}
