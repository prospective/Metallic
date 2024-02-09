import React from "react";
import Proxy from "../components/proxy.jsx";
import { getLink } from "../util.jsx";

function Home() {
  var proxy = React.useRef();
  var useEffect = React.useEffect;
  
  useEffect(() => {
    fetch("/v1/data/" + encodeURIComponent(window.location.pathname))
      .then((response) => response.json())
      .then((data) => {
        if (!data || !data.payload) {
          return;
        }
        setTimeout(() => {
          var config = data.payload;
          config.url = getLink(config.url);
          proxy.current.open(config);
        }, 1000);
      });
  }, []);

  return (
    <>
      <Proxy ref={proxy} />
      <div class="lds-dual-ring"></div>
    </>
  );
}

export default Home;
