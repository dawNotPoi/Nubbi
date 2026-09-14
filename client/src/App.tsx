import { AppProvider } from "./AppProvider";
import { RouteWrapper } from "./Route";
function App() {
  return (
    <AppProvider>
      <RouteWrapper />
    </AppProvider>
  );
}

export default App;
