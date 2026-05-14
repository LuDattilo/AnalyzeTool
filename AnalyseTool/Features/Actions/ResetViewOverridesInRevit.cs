using AnalyseTool.Common.FeaturesBase;
using AnalyseTool.Utils;
using Autodesk.Revit.DB;
using Microsoft.Web.WebView2.Wpf;
using Newtonsoft.Json.Linq;

namespace AnalyseTool.Features.Actions
{
    internal class ResetViewOverridesInRevit : IRevitTask
    {
        public async Task Execute(JToken data, WebView2 webView)
        {
            ResetViewPayload? payload = data?.ToObject<ResetViewPayload>();
            bool resetAll = payload?.ResetAll != false;
            List<long>? scopedIds = payload?.ElementIds;

            ExternalEventHub.RevitExternalEvent.action = () =>
            {
                RevitTransactions.Run("Reset view overrides", webView, () =>
                {
                    View view = Context.Document.ActiveView;
                    if (view == null) return;

                    if (view.IsTemporaryHideIsolateActive())
                    {
                        view.DisableTemporaryViewMode(TemporaryViewMode.TemporaryHideIsolate);
                    }

                    if (view.IsTemporaryViewPropertiesModeEnabled())
                    {
                        view.DisableTemporaryViewMode(TemporaryViewMode.TemporaryViewProperties);
                    }

                    if (!view.AreGraphicsOverridesAllowed()) return;

                    OverrideGraphicSettings empty = new OverrideGraphicSettings();

                    if (resetAll)
                    {
                        ICollection<ElementId> ids = new FilteredElementCollector(Context.Document, view.Id)
                            .WhereElementIsNotElementType()
                            .ToElementIds();

                        foreach (ElementId id in ids)
                        {
                            try
                            {
                                view.SetElementOverrides(id, empty);
                            }
                            catch
                            {
                            }
                        }

                        try
                        {
                            view.UnhideElements(ids);
                        }
                        catch
                        {
                        }
                    }
                    else if (scopedIds != null && scopedIds.Count > 0)
                    {
                        List<ElementId> scoped = scopedIds
                            .Where(x => x != null)
                            .Select(x => new ElementId(x))
                            .ToList();

                        foreach (ElementId id in scoped)
                        {
                            try
                            {
                                view.SetElementOverrides(id, empty);
                            }
                            catch
                            {
                            }
                        }

                        try
                        {
                            view.UnhideElements(scoped);
                        }
                        catch
                        {
                        }
                    }
                });
            };

            ExternalEventHub.RevitEvent.Raise();
        }

        private record ResetViewPayload
        {
            public bool ResetAll { get; set; } = true;
            public List<long>? ElementIds { get; set; }
        }
    }
}
