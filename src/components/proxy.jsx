import { useLocalWindow } from "../settings.jsx";
import React from "react";

var Proxy = React.forwardRef(({ overrideWindow }, ref) => {
  var web = React.createRef();
  var [config, setConfig] = React.useState();
  var [localWindow] = useLocalWindow();

  React.useImperativeHandle(
    ref,
    () => ({
      open: (config) => {
        switch (overrideWindow || localWindow) {
          case "simple":
            window.location.href = config.url;
            break;
          case "ab":
            var page = window.open();
            page.document.body.innerHTML =
              `<iframe style="height:100%; width: 100%; border: none; position: fixed; top: 0; right: 0; left: 0; bottom: 0; border: none" sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-top-navigation allow-top-navigation-by-user-activation" src="` +
              new URL(config.url, window.location) +
              `"></iframe>`;
            break;
          case "iframe":
            document.body.innerHTML =
              `<iframe style="height:100%; width: 100%; border: none; position: fixed; top: 0; right: 0; left: 0; bottom: 0; border: none" sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-top-navigation allow-top-navigation-by-user-activation" src="` +
              new URL(config.url, window.location) +
              `"></iframe>`;
            break;
          default:
          case "default":
            document.body.style.overflow = "hidden";
            setConfig({
              url: config.url,
              title: null,
              icon: null,
            });
        }
        setConfig(config);
      },
    }),
    [localWindow, overrideWindow]
  );

  if (!config) return;

  return (
    <>
      <iframe
        onLoad={async () => {
          if (config.inject) {
            switch (config.inject.type) {
              case 'script':
                web.current.contentWindow.eval(config.inject.content);
                break;
              default:
                break;
            }
          }
        }}
        ref={web}
        className="web"
        src={config.url}
        title="Website"
        id="web"
      ></iframe>
    </>
  );
});

export { Proxy as default };
