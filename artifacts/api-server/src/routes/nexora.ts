import { Router, type IRouter } from "express";
import { proxyIntelligence, proxyNexora } from "../lib/nexora-upstream";

const router: IRouter = Router();

router.get("/nexora/overview", (req, res) =>
  proxyNexora(req, res, "/overview"),
);
router.get("/nexora/customers", (req, res) =>
  proxyNexora(req, res, `/customers${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`),
);
router.post("/nexora/customers", (req, res) =>
  proxyNexora(req, res, "/customers", "POST", req.body),
);
router.get("/nexora/sales", (req, res) =>
  proxyNexora(req, res, `/sales${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`),
);
router.get("/nexora/finance", (req, res) =>
  proxyNexora(req, res, `/finance${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`),
);
router.get("/nexora/stock", (req, res) =>
  proxyNexora(req, res, "/stock"),
);
router.post("/nexora/stock/:id/restock", (req, res) =>
  proxyNexora(req, res, `/stock/${req.params.id}/restock`, "POST", req.body),
);
router.get("/nexora/suppliers", (req, res) =>
  proxyNexora(req, res, "/suppliers"),
);
router.get("/nexora/alerts", (req, res) =>
  proxyNexora(req, res, "/alerts"),
);
router.post("/nexora/alerts/:id/acknowledge", (req, res) =>
  proxyNexora(req, res, `/alerts/${req.params.id}/acknowledge`, "POST", req.body),
);
router.get("/nexora/approvals", (req, res) =>
  proxyNexora(req, res, "/approvals"),
);
router.post("/nexora/approvals/:id/decision", (req, res) =>
  proxyNexora(req, res, `/approvals/${req.params.id}/decision`, "POST", req.body),
);
router.post("/nexora/intelligence", (req, res) =>
  proxyIntelligence(req, res, req.body),
);

export default router;