import { AppProvider } from "./AppProvider";
import { RouteWrapper } from "./Route/Route";
function App() {
  return (
    <AppProvider>
      <RouteWrapper />
    </AppProvider>
  );
}

export default App;
