import { useEffect, useState } from 'react';

type KofiWidgetApi = {
  init: (label: string, color: string, account: string) => void;
  getHTML: () => string;
};

declare global {
  interface Window {
    kofiwidget2?: KofiWidgetApi;
  }
}

let widgetLoad: Promise<KofiWidgetApi> | undefined;

function loadWidget(): Promise<KofiWidgetApi> {
  if (window.kofiwidget2) return Promise.resolve(window.kofiwidget2);
  if (!widgetLoad) {
    widgetLoad = new Promise<KofiWidgetApi>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://storage.ko-fi.com/cdn/widget/Widget_2.js';
      script.async = true;
      script.dataset.kofiWidget = 'true';
      script.onload = () => {
        if (window.kofiwidget2) resolve(window.kofiwidget2);
        else {
          script.remove();
          reject(new Error('Ko-fi widget did not initialize.'));
        }
      };
      script.onerror = () => {
        script.remove();
        reject(new Error('Ko-fi widget could not load.'));
      };
      document.body.appendChild(script);
    }).catch(error => {
      widgetLoad = undefined;
      throw error;
    });
  }
  return widgetLoad;
}

export function KofiWidget() {
  const [html, setHtml] = useState<string>();
  useEffect(() => {
    let active = true;
    loadWidget().then(widget => {
      if (!active) return;
      widget.init('Support me on Ko-fi', '#72a4f2', 'Q8D224IG19');
      // draw() uses document.writeln(), which can erase an already loaded page.
      setHtml(widget.getHTML());
    }).catch(() => {
      // Keep the support link usable when the external script is unavailable.
    });
    return () => { active = false; };
  }, []);

  return <div className="kofi-widget">{html
    ? <div dangerouslySetInnerHTML={{ __html: html }} />
    : <a className="kofi-widget-fallback" href="https://ko-fi.com/Q8D224IG19" target="_blank" rel="noopener noreferrer">Support me on Ko-fi</a>
  }</div>;
}
