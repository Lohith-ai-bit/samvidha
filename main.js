/**
* Template Name: Lonely - v2.0.0
* Template URL: https://bootstrapmade.com/free-html-bootstrap-template-lonely/
* Author: BootstrapMade.com
* License: https://bootstrapmade.com/license/
*/
!(function($) {
  "use strict";

  // Smooth scroll for the navigation menu and links with .scrollto classes
  $(document).on('click', '.nav-menu a, .mobile-nav a, .scrollto', function(e) {
    if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
      e.preventDefault();
      var target = $(this.hash);
      if (target.length) {
        var scrollto = target.offset().top;
        var scrolled = 20;
        if ($('#header').length) {
          scrollto -= $('#header').outerHeight()
          if (!$('#header').hasClass('header-scrolled')) {
            scrollto += scrolled;
          }
        }
        if ($(this).attr("href") == '#header') {
          scrollto = 0;
        }
        $('html, body').animate({
          scrollTop: scrollto
        }, 1500, 'easeInOutExpo');
        if ($(this).parents('.nav-menu, .mobile-nav').length) {
          $('.nav-menu .active, .mobile-nav .active').removeClass('active');
          $(this).closest('li').addClass('active');
        }
        if ($('body').hasClass('mobile-nav-active')) {
          $('body').removeClass('mobile-nav-active');
          $('.mobile-nav-toggle i').toggleClass('icofont-navigation-menu icofont-close');
          $('.mobile-nav-overly').fadeOut();
        }
        return false;
      }
    }
  });
  	
  // Mobile Navigation
  if ($('.nav-menu').length) {
    var $mobile_nav = $('.nav-menu').clone().prop({
      class: 'mobile-nav d-lg-none'
    });
    $('body').append($mobile_nav);
    $('body').prepend('<button type="button" class="mobile-nav-toggle d-lg-none"><i class="icofont-navigation-menu"></i></button>');
    $('body').append('<div class="mobile-nav-overly"></div>');
    $(document).on('click', '.mobile-nav-toggle', function(e) {
      $('body').toggleClass('mobile-nav-active');
      $('.mobile-nav-toggle i').toggleClass('icofont-navigation-menu icofont-close');
      $('.mobile-nav-overly').toggle();
    });
    $(document).on('click', '.mobile-nav .drop-down > a', function(e) {
      e.preventDefault();
      $(this).next().slideToggle(300);
      $(this).parent().toggleClass('active');
    });
    $(document).click(function(e) {
      var container = $(".mobile-nav, .mobile-nav-toggle");
      if (!container.is(e.target) && container.has(e.target).length === 0) {
        if ($('body').hasClass('mobile-nav-active')) {
          $('body').removeClass('mobile-nav-active');
          $('.mobile-nav-toggle i').toggleClass('icofont-navigation-menu icofont-close');
          $('.mobile-nav-overly').fadeOut();
        }
      }
    });
  } else if ($(".mobile-nav, .mobile-nav-toggle").length) {
    $(".mobile-nav, .mobile-nav-toggle").hide();
  }

  // Stick the header at top on scroll
  $("#header").sticky({
    topSpacing: 0,
    zIndex: '50'
  });

  // Back to top button
  $(window).scroll(function() {
    if ($(this).scrollTop() > 100) {
      $('.back-to-top').fadeIn('slow');
    } else {
      $('.back-to-top').fadeOut('slow');
    }
  });
  $('.back-to-top').click(function() {
    $('html, body').animate({
      scrollTop: 0
    }, 1500, 'easeInOutExpo');
    return false;
  });

 
  

  

  
	$(document).ready(function(){
		$("#but_submit").click(function(e){
			
			var username = $("#txt_uname").val().trim();
			var password = $("#txt_pwd").val().trim();
			if(username == ''){
				$("#txt_uname").css('border', '1px solid #d40404');
			}
			else{
				 $("#txt_uname").removeAttr("style");
			}
			if(password == ''){
				$("#txt_pwd").css('border', '1px solid #d40404');
			}else{
				 $("#txt_pwd").removeAttr("style");
			}
			if( username != "" && password != "" ){
				var csrfToken = $('meta[name="csrf-token"]').attr('content');

				console.log("CSRF Token:", csrfToken);
				e.preventDefault();
				$.ajax({
					url:'pages/login/checkUser.php',
					type:'POST',
					headers: {
						"X-CSRF-Token": csrfToken
					},
					data:{username:username,password:password},
					success:function(response){
						var msg = "";
						if(response.status == 1){
							window.location = host+"home";
						}else if(response.status == 2){
							msg = "Your Login is expired or not active. Please contact administrator!";
						}else{
							msg = response.msg//"Invalid username or password!";
						}
						$(".login-box-msg").html(msg);
					},
					error: function(xhr) {
						if (xhr.status === 403) {
							alert("Invalid security token. Please refresh the page.");
						}
						console.log("Status:", xhr.status);
						console.log("Response:", xhr.responseText);
					}
				});
			}
		});
		
		var dd = $('#demo1').easyTicker({
			direction: 'up',
			speed: 'slow',
			interval: 3000,
			height: 'auto',
			visible: 3,
			mousePause: 1,
		}).data('easyTicker');
		var dd = $('#demo2').easyTicker({
			direction: 'up',
			speed: 'slow',
			interval: 3000,
			height: 'auto',
			visible: 3,
			mousePause: 1,
		}).data('easyTicker');
		
    
	});
})(jQuery);