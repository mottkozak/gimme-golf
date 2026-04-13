package com.gimmegolf.app;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.Log;
import android.net.Uri;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayDeque;
import java.util.Set;

import androidx.annotation.NonNull;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String NATIVE_DIAGNOSTICS_TAG = "GGNative";
    private static final String NATIVE_DIAGNOSTICS_EVENT_NAME = "gimmegolf:native-diagnostics";
    private static final int MAX_PENDING_DIAGNOSTIC_SCRIPTS = 40;
    private final ArrayDeque<String> pendingDiagnosticScripts = new ArrayDeque<>();
    private long activityCreatedAtElapsedMs = 0L;
    private int memoryWarningCount = 0;
    private int deepLinkOpenCount = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        activityCreatedAtElapsedMs = SystemClock.elapsedRealtime();
        super.onCreate(savedInstanceState);
        configureEdgeToEdgeSystemBars();
        logLifecycle("onCreate");
        emitLaunchTrace(savedInstanceState != null);
        emitDeepLinkDiagnostics("launch_intent", getIntent(), true);
        flushPendingDiagnosticScripts();
    }

    @Override
    protected void onStart() {
        super.onStart();
        logLifecycle("onStart");
    }

    @Override
    protected void onResume() {
        super.onResume();
        logLifecycle("onResume");
        flushPendingDiagnosticScripts();
    }

    @Override
    protected void onPause() {
        logLifecycle("onPause");
        super.onPause();
    }

    @Override
    protected void onStop() {
        logLifecycle("onStop");
        super.onStop();
    }

    @Override
    protected void onDestroy() {
        logLifecycle("onDestroy");
        super.onDestroy();
    }

    @Override
    protected void onNewIntent(@NonNull Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        logLifecycle("onNewIntent");
        emitDeepLinkDiagnostics("on_new_intent", intent, true);
    }

    @Override
    public void onLowMemory() {
        memoryWarningCount += 1;
        emitMemoryDiagnostics("low_memory", 0);
        super.onLowMemory();
    }

    @Override
    public void onTrimMemory(int level) {
        memoryWarningCount += 1;
        emitMemoryDiagnostics("trim_memory", level);
        super.onTrimMemory(level);
    }

    private void configureEdgeToEdgeSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        WindowInsetsControllerCompat insetsController =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (insetsController != null) {
            // Default to dark status/nav content while the app bootstraps; JS theme logic can override.
            insetsController.setAppearanceLightStatusBars(true);
            insetsController.setAppearanceLightNavigationBars(true);
        }
    }

    private void logLifecycle(String eventName) {
        JSONObject payload = new JSONObject();
        try {
            payload.put("phase", eventName);
        } catch (Exception ignored) {
            return;
        }
        emitNativeDiagnostics("lifecycle", payload);

        if (!BuildConfig.DEBUG) {
            return;
        }
        Log.d(NATIVE_DIAGNOSTICS_TAG, "Android lifecycle: " + eventName);
    }

    private void emitLaunchTrace(boolean savedInstanceStatePresent) {
        JSONObject payload = new JSONObject();
        try {
            payload.put("savedInstanceStatePresent", savedInstanceStatePresent);
            payload.put(
                    "activityCreateToEmitMs",
                    Math.max(0, SystemClock.elapsedRealtime() - activityCreatedAtElapsedMs)
            );
            payload.put("launchTimestampMs", System.currentTimeMillis());
        } catch (Exception ignored) {
            return;
        }

        emitNativeDiagnostics("launch_trace", payload);
    }

    private void emitMemoryDiagnostics(String eventName, int level) {
        JSONObject payload = new JSONObject();
        try {
            payload.put("memoryWarningCount", memoryWarningCount);
            payload.put("level", level);
        } catch (Exception ignored) {
            return;
        }

        emitNativeDiagnostics(eventName, payload);
    }

    private void emitDeepLinkDiagnostics(String source, Intent intent, boolean handled) {
        if (intent == null) {
            return;
        }

        Uri data = intent.getData();
        if (data == null) {
            return;
        }

        deepLinkOpenCount += 1;

        JSONObject payload = new JSONObject();
        try {
            payload.put("source", source);
            payload.put("handled", handled);
            payload.put("deepLinkOpenCount", deepLinkOpenCount);
            payload.put("url", makeSanitizedUrlPayload(data));
        } catch (Exception ignored) {
            return;
        }

        emitNativeDiagnostics("deep_link", payload);
    }

    private JSONObject makeSanitizedUrlPayload(Uri data) {
        JSONObject payload = new JSONObject();
        JSONArray queryKeys = new JSONArray();

        try {
            Set<String> queryParameterNames = data.getQueryParameterNames();
            for (String queryParameterName : queryParameterNames) {
                queryKeys.put(queryParameterName);
            }
        } catch (Exception ignored) {
            // Opaque URIs or malformed deep links can throw; keep payload minimal.
        }

        try {
            payload.put("scheme", stringOrEmpty(data.getScheme()));
            payload.put("host", stringOrEmpty(data.getHost()));
            payload.put("path", stringOrEmpty(data.getPath()));
            payload.put("hasQuery", queryKeys.length() > 0);
            payload.put("queryKeys", queryKeys);
            payload.put("hasFragment", data.getFragment() != null && !data.getFragment().isEmpty());
        } catch (Exception ignored) {
            // No-op: caller already handles delivery failures.
        }

        return payload;
    }

    private String stringOrEmpty(String value) {
        return value == null ? "" : value;
    }

    private void emitNativeDiagnostics(String eventName, JSONObject payload) {
        JSONObject detail = new JSONObject();
        try {
            detail.put("event", eventName);
            detail.put("platform", "android");
            detail.put("timestampMs", System.currentTimeMillis());
            detail.put("payload", payload);
        } catch (Exception ignored) {
            return;
        }

        String script = "window.dispatchEvent(new CustomEvent('"
                + NATIVE_DIAGNOSTICS_EVENT_NAME
                + "', { detail: "
                + detail.toString()
                + " }));";

        dispatchDiagnosticScript(script);
    }

    private void dispatchDiagnosticScript(String script) {
        if (bridge == null || bridge.getWebView() == null) {
            queueDiagnosticScript(script);
            return;
        }

        bridge.getWebView().post(() -> bridge.getWebView().evaluateJavascript(script, null));
    }

    private void queueDiagnosticScript(String script) {
        if (pendingDiagnosticScripts.size() >= MAX_PENDING_DIAGNOSTIC_SCRIPTS) {
            pendingDiagnosticScripts.removeFirst();
        }
        pendingDiagnosticScripts.addLast(script);
    }

    private void flushPendingDiagnosticScripts() {
        if (bridge == null || bridge.getWebView() == null) {
            return;
        }

        while (!pendingDiagnosticScripts.isEmpty()) {
            String pendingScript = pendingDiagnosticScripts.removeFirst();
            bridge.getWebView().post(() -> bridge.getWebView().evaluateJavascript(pendingScript, null));
        }
    }
}
