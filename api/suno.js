const ALLOWED_HOSTS = {
  kie: "api.kie.ai",
  sunoapi: "api.sunoapi.org"
};

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // نقطة استقبال إشعارات سونو (Callback) لضمان نجاح الطلب دائماً
  if (req.query && req.query.cb === "1") {
    return res.status(200).json({ code: 200, status: "received" });
  }

  try {
    const provider = req.query.provider || "kie";
    const apiPath = req.query.path || "";
    const host = ALLOWED_HOSTS[provider];

    if (!host) {
      return res.status(400).json({ code: 400, msg: "مزود غير مدعوم" });
    }
    if (!apiPath.startsWith("/api/v1/")) {
      return res.status(400).json({ code: 400, msg: "مسار API غير صالح" });
    }

    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ code: 401, msg: "يرجى إدخال مفتاح API أولاً" });
    }

    const targetUrl = `https://${host}${apiPath}`;
    const fetchOptions = {
      method: req.method,
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json"
      }
    };

    if (req.method === "POST" && req.body) {
      fetchOptions.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    }

    const upstream = await fetch(targetUrl, fetchOptions);
    const rawText = await upstream.text();

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = { code: upstream.status, msg: rawText || "استجابة غير متوقعة من الخادم" };
    }

    return res.status(upstream.status).json(parsed);
  } catch (err) {
    return res.status(500).json({ code: 500, msg: "فشل الاتصال بخادم سونو: " + err.message });
  }
};
