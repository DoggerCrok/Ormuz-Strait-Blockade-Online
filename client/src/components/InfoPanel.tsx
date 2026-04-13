import { ExternalLink } from "lucide-react";

export default function InfoPanel() {
  return (
    <div className="flex flex-col gap-5 p-4 text-sm">
      {/* About */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">О приложении</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Мониторинг судоходства через Ормузский пролив в режиме реального времени. 
          Данные AIS позволяют отслеживать движение танкеров, газовозов и других судов 
          через стратегический пролив.
        </p>
      </div>

      {/* Restrictions notice */}
      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
        <h3 className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1.5">Ограничения с 13.04.2026</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Иран ввёл ограничения на судоходство в Ормузском проливе, вступившие в силу 
          <strong className="text-foreground"> 14:00 UTC 13 апреля 2026 года</strong>.
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
          По данным UKMTO, транзит судов к <strong className="text-foreground">неиранским направлениям 
          пока не сообщался как перекрытый</strong>. Ситуация продолжает развиваться.
        </p>
        <a
          href="https://en.thairath.co.th/news/foreign/2926551"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-1.5"
          data-testid="link-ukmto-article"
        >
          <ExternalLink className="h-3 w-3" />
          Источник: Thai Rath / UKMTO
        </a>
      </div>

      {/* Sources */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Источники данных</h3>
        <div className="flex flex-col gap-2">
          <a
            href="https://aisstream.io/documentation"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-primary hover:underline"
            data-testid="link-aisstream-docs"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            AISStream Documentation
          </a>
          <a
            href="https://github.com/aisstream/aisstream"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-primary hover:underline"
            data-testid="link-aisstream-github"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            AISStream GitHub
          </a>
          <a
            href="https://en.thairath.co.th/news/foreign/2926551"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-primary hover:underline"
            data-testid="link-article-ukmto"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            Thai Rath — UKMTO об ограничениях
          </a>
        </div>
      </div>

      {/* Technical */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Технические сведения</h3>
        <div className="text-xs text-muted-foreground space-y-1.5">
          <p>• Карта: MapLibre GL JS + OpenStreetMap</p>
          <p>• Протокол: AISStream WebSocket v0</p>
          <p>• Сообщения AIS: PositionReport, StandardClassBPositionReport, ExtendedClassBPositionReport, ShipStaticData, StaticDataReport</p>
          <p>• Линия пересечения: 56.5°E между 25.8°N и 27.0°N</p>
          <p>• Bounding box: 54.5–60.0°E / 22.5–27.5°N</p>
          <p>• Флаг по MID-префиксу MMSI (3 цифры)</p>
          <p>• Ключ API: только в памяти сервера, не сохраняется на диск</p>
        </div>
      </div>

      {/* AIS types */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Типы AIS</h3>
        <div className="text-xs text-muted-foreground space-y-1">
          {[
            ["80–89", "Танкеры (80=общ., 81=нефть, 82=СПГ, 83=химия)"],
            ["70–79", "Сухогрузы (70=общ., 71=навалочн., 72=контейн.)"],
            ["60–69", "Пассажирские суда"],
            ["50–59", "Спецслужбы, буксиры, SAR, военные"],
          ].map(([code, desc]) => (
            <div key={code} className="flex gap-2">
              <span className="font-mono shrink-0 text-foreground">{code}</span>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-[10px] text-muted-foreground border-t border-border pt-3 leading-relaxed">
        Данные AIS предоставляются «как есть» через публичный API. Точность и полнота 
        не гарантированы. В демо-режиме все данные синтетические и не отражают реального 
        положения судов. Не использовать для навигации.
      </div>
    </div>
  );
}
