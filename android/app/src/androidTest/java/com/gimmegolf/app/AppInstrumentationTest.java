package com.gimmegolf.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class AppInstrumentationTest {

    @Test
    public void appContextUsesReleasePackageName() {
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("com.gimmegolf.app", appContext.getPackageName());
    }

    @Test
    public void authCallbackDeepLinkResolvesToMainActivity() {
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        PackageManager packageManager = appContext.getPackageManager();

        Intent callbackIntent = new Intent(
                Intent.ACTION_VIEW,
                Uri.parse("gimmegolf://auth/callback?source=androidTest")
        );
        callbackIntent.addCategory(Intent.CATEGORY_BROWSABLE);
        callbackIntent.setPackage(appContext.getPackageName());

        ResolveInfo resolvedActivity = packageManager.resolveActivity(
                callbackIntent,
                PackageManager.MATCH_DEFAULT_ONLY
        );

        assertNotNull("Auth callback deep-link should resolve to this app.", resolvedActivity);
        assertEquals(appContext.getPackageName(), resolvedActivity.activityInfo.packageName);
        assertEquals("com.gimmegolf.app.MainActivity", resolvedActivity.activityInfo.name);
    }

    @Test
    public void httpsAppLinkResolvesToMainActivity() {
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        PackageManager packageManager = appContext.getPackageManager();

        Intent webAppLinkIntent = new Intent(
                Intent.ACTION_VIEW,
                Uri.parse("https://gimme-golf.app/auth/callback")
        );
        webAppLinkIntent.addCategory(Intent.CATEGORY_BROWSABLE);
        webAppLinkIntent.setPackage(appContext.getPackageName());

        ResolveInfo resolvedActivity = packageManager.resolveActivity(
                webAppLinkIntent,
                PackageManager.MATCH_DEFAULT_ONLY
        );

        assertNotNull("Verified HTTPS app link should resolve to this app.", resolvedActivity);
        assertEquals(appContext.getPackageName(), resolvedActivity.activityInfo.packageName);
        assertEquals("com.gimmegolf.app.MainActivity", resolvedActivity.activityInfo.name);
    }
}
