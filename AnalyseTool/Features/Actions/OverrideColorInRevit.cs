using AnalyseTool.Common.FeaturesBase;
using AnalyseTool.Utils;
using Autodesk.Revit.DB;
using Microsoft.Web.WebView2.Wpf;
using Newtonsoft.Json.Linq;

namespace AnalyseTool.Features.Actions
{
    internal class OverrideColorInRevit : IRevitTask
    {
        public async Task Execute(JToken data, WebView2 webView)
        {
            OverrideColorPayload? payload = data.ToObject<OverrideColorPayload>();
            if (payload == null || payload.ElementIds == null) return;

            List<ElementId> elementIds = payload.ElementIds
                .Where(x => x != null)
                .Select(x => new ElementId(x))
                .ToList();
            if (!elementIds.Any()) return;

            if (!TryParseHexColor(payload.Color, out byte r, out byte g, out byte b))
            {
                r = 0xEF; g = 0x44; b = 0x44;
            }

            ExternalEventHub.RevitExternalEvent.action = () =>
            {
                RevitTransactions.Run("Override color in view", webView, () =>
                {
                    View view = Context.Document.ActiveView;
                    if (view == null || !view.AreGraphicsOverridesAllowed())
                    {
                        WebViewErrorHelper.SendError(webView, nameof(OverrideColorInRevit),
                            "Graphic overrides are not allowed on the active view.");
                        return;
                    }

                    Color color = new Color(r, g, b);
                    ElementId? solidFillId = GetSolidFillPatternId(Context.Document);

                    OverrideGraphicSettings ogs = new OverrideGraphicSettings();
                    ogs.SetSurfaceForegroundPatternColor(color);
                    ogs.SetSurfaceForegroundPatternVisible(true);
                    if (solidFillId != null) ogs.SetSurfaceForegroundPatternId(solidFillId);

                    ogs.SetCutForegroundPatternColor(color);
                    ogs.SetCutForegroundPatternVisible(true);
                    if (solidFillId != null) ogs.SetCutForegroundPatternId(solidFillId);

                    ogs.SetProjectionLineColor(color);
                    ogs.SetCutLineColor(color);

                    foreach (ElementId id in elementIds)
                    {
                        try
                        {
                            view.SetElementOverrides(id, ogs);
                        }
                        catch
                        {
                        }
                    }
                });
            };

            ExternalEventHub.RevitEvent.Raise();
        }

        private static ElementId? GetSolidFillPatternId(Document doc)
        {
            FillPatternElement? solid = new FilteredElementCollector(doc)
                .OfClass(typeof(FillPatternElement))
                .Cast<FillPatternElement>()
                .FirstOrDefault(f =>
                {
                    FillPattern p = f.GetFillPattern();
                    return p != null && p.IsSolidFill && p.Target == FillPatternTarget.Drafting;
                });
            return solid?.Id;
        }

        private static bool TryParseHexColor(string? value, out byte r, out byte g, out byte b)
        {
            r = g = b = 0;
            if (string.IsNullOrWhiteSpace(value)) return false;
            string hex = value!.Trim().TrimStart('#');
            if (hex.Length != 6) return false;
            try
            {
                r = Convert.ToByte(hex.Substring(0, 2), 16);
                g = Convert.ToByte(hex.Substring(2, 2), 16);
                b = Convert.ToByte(hex.Substring(4, 2), 16);
                return true;
            }
            catch
            {
                return false;
            }
        }

        private record OverrideColorPayload
        {
            public List<long>? ElementIds { get; set; }
            public string? Color { get; set; }
        }
    }
}
