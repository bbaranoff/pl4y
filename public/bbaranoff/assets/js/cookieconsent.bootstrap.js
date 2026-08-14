---
---
var ccb =
{
    version: '0.0.2',
    jqueryattempts: 0,
    setupcomplete: false,
    show_banner: true,
    consent_approved: false,
    style: "{{ site.cookieconsent.style }}",
    cookies: { 
{% for cookie in site.cookieconsent.cookies %}
      {{ cookie.name }}: {
        title: "{{ cookie.title }}",
        description: "{{ cookie.description }}",
        disabled: {{ cookie.disabled }},
        allowed: {{ cookie.allowed }},
        expirydays: {{ cookie.expirydays }},
        loaded: false
      }, 
{% endfor %}
    },

    strings: {
        notificationHead: "{{ site.cookieconsent.notificationHead }}",
        notificationText: "{{ site.cookieconsent.notificationText }}",
        btnAcceptAll: "{{ site.cookieconsent.btnAcceptAll }}",
        btnAcceptSelected: "{{ site.cookieconsent.btnAcceptSelected }}",
        btnMore: "{{ site.cookieconsent.btnMore }}",
    },
    
    onfirstload: function () {
        if (!ccb.setupcomplete) {
            if (!(window.jQuery)) {
                ccb.jqueryattempts++;
                if (ccb.jqueryattempts >= 5) {
                    return;
                }
                setTimeout(ccb.onfirstload, 200);
                return;
            }
            ccb.setupcomplete = true;
        }
        ccb.checkapproval();
    },
    initialise: function (obj) {
        if (obj.show_banner !== undefined) {
            ccb.show_banner = obj.show_banner;
        }
        // check if jquery has been loaded
        ccb.onfirstload();
    },
    checkapproval: function () {
      ccb.readCookies();
      if (!ccb.consent_approved) {
        if (ccb.show_banner) {
          ccb.showBanner();
        }
      } else {
        ccb.executeScripts();
      }
    },
    readCookies: function () {
      var i, x, y, ARRcookies = document.cookie.split(";");
      for (i = 0; i < ARRcookies.length; i++) {
          x = ARRcookies[i].substr(0, ARRcookies[i].indexOf("="));
          y = ARRcookies[i].substr(ARRcookies[i].indexOf("=") + 1);
          x = x.replace(/^\s+|\s+$/g, "");
          cookieval =  unescape(y);
          if (cookieval) {
            if (x in ccb.cookies) {
              if (cookieval == "true") {
                ccb.cookies[x].allowed = true;
              } else {
                ccb.cookies[x].allowed = false;
              }
              ccb.cookies[x].loaded = true;
            }
          }
      }
      ccb.consent_approved = true;
      jQuery.each(ccb.cookies, function (key, value) {
        if (!ccb.cookies[key].loaded) {
          ccb.consent_approved = false;
        }
      });
    },
    setcookie: function (name, value, expirydays) {
        var exdate = new Date();
        exdate.setDate(exdate.getDate() + expirydays);
        document.cookie = name + '=' + value + '; expires=' + exdate.toUTCString() + '; path=/' + '; SameSite=Strict'
    },
    showBanner: function () {
        jQuery('#ccb-notification').remove();
        if (ccb.style == "dark") {
          background_color = "bg-dark";
          text_color = "text-white";
          btn_select_color = "btn-outline-light";
        } else {
          background_color = "bg-light";
          text_color = "text-black";
          btn_select_color = "btn-outline-dark";
        }
        data = `
          <div class="modal fade show" id="cookieDialog" role="dialog" data-backdrop="static">
            <div class="modal-dialog modal-lg" role="document">
              <div class="modal-content ${background_color} ${text_color}">
                <div class="modal-header">
                  <h4><div id="ccb-notification-head"><i class="fas fa-cookie-bite"></i>&nbsp;</div></h4>
                </div>
                <div class="modal-body">
                  <p><div id="ccb-notification-text"></div></p>
                  <div id="ccb-cookie-list" class="d-flex flex-row mb-1"></div>
                  <div class="collapse" id="collapseCookieDetails">
                    <div class="d-flex flex-column mb-1" id="ccb-cookie-details">
                    </div>
                  </div>
                </div>
                <div class="modal-footer d-flex flex-column">
                  <button type="button" class="btn btn-success mt-3 btn-lg btn-block" id="ccb-btnAcceptAll">
                    Accept All
                  </button>
                   <button type="button" class="btn ${btn_select_color} mt-3 btn-lg btn-block" id="ccb-btnAcceptSelected">
                    Accept only selected
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
        

        jQuery('body').prepend(data);
        jQuery('#ccb-notification-head').append(ccb.strings.notificationHead);
        jQuery('#ccb-notification-text').html(ccb.strings.notificationText);
        jQuery('#ccb-btnAcceptAll').html(ccb.strings.btnAcceptAll);
        jQuery('#ccb-btnAcceptAll').click(function() {
          jQuery.each(ccb.cookies, function (key, value) {
            if (!ccb.cookies[key].disabled) {
              ccb.cookies[key].allowed = true;
            }
          });
          ccb.closeBanner();
        });
        jQuery('#ccb-btnAcceptSelected').html(ccb.strings.btnAcceptSelected);
        jQuery('#ccb-btnAcceptSelected').click(function() {
          jQuery.each(ccb.cookies, function (key, value) {
            if (!ccb.cookies[key].disabled) {
              ccb.cookies[key].allowed = jQuery(`#ccb-toggle-${key}`).is(":checked");
            }
          });
          ccb.closeBanner();
        });
       jQuery.each(ccb.cookies, function (key, value) {
          data_cookie = `
            <div class="pr-1">
              <label class="switch">
                <input type="checkbox" id="ccb-toggle-${key}">
                <span class="slider round"></span>
              </label>
            </div>
            <div class="pl-2 pr-5">${ccb.cookies[key].title}</div>
          `;
          data_more = `
            <div class="mt-2">${ccb.cookies[key].description}</div>
          `;
          jQuery('#ccb-cookie-list').append(data_cookie);
          jQuery('#ccb-cookie-details').append(data_more);
          jQuery(`#ccb-toggle-${key}`).attr('checked', ccb.cookies[key].allowed);
          jQuery(`#ccb-toggle-${key}`).attr('disabled', ccb.cookies[key].disabled);
        });
        data_more = `
          <div>
            <a data-toggle="collapse" href="#collapseCookieDetails" role="button" aria-expanded="false" aria-controls="collapseCookieDetails">
              ${ccb.strings.btnMore}...
            </a>
          </div>
        `;
        jQuery('#ccb-cookie-list').append(data_more);
        $('#cookieDialog').modal('show')
    },
    closeBanner: function () {
      $('#cookieDialog').modal('hide')
      ccb.consent_approved = true;
      jQuery.each(ccb.cookies, function (key, value) {
        ccb.setcookie(key, ccb.cookies[key].allowed, ccb.cookies[key].expirydays);
      });
      ccb.executeScripts();
    },
    executeScripts: function () {
      jQuery('script.ccb-cookie-consent[type="text/plain"]').each(function () {
        key = jQuery(this).attr("ccb-cookie-type");
        if (ccb.cookies[key].allowed) {
          if (jQuery(this).attr('src')) {
            jQuery(this).after('<script type="text/javascript" src="' + jQuery(this).attr('src') + '"></script>');
          } else {
            jQuery(this).after('<script type="text/javascript">' + jQuery(this).html() + '</script>');
          }
          jQuery(this).remove();
        }
      });
    },
    isPersonalAdsAllowed: function() {
      return ccb.cookies["ccb_advertising"].allowed;
    }
}