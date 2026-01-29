<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<div class="site-wrapper">
    <header class="site-header">
        <pre class="ascii-banner">
    ____             __                 __     ____  _                __
   / __ \____ ______/ /______  ___  / /_   / __ \(_)_______  _____/ /_____  _______  __
  / / / / __ `/ ___/ //_/ __ \/ _ \/ __/  / / / / / ___/ _ \/ ___/ __/ __ \/ ___/ / / /
 / /_/ / /_/ / /  / ,< / / / /  __/ /_   / /_/ / / /  /  __/ /__/ /_/ /_/ / /  / /_/ /
/_____/\__,_/_/  /_/|_/_/ /_/\___/\__/  /_____/_/_/   \___/\___/\__/\____/_/   \__, /
                                                                              /____/
        </pre>

        <div class="site-branding">
            <h1 class="site-title">
                <a href="<?php echo esc_url(home_url('/')); ?>">
                    <?php bloginfo('name'); ?>
                </a>
            </h1>
            <?php
            $description = get_bloginfo('description', 'display');
            if ($description || is_customize_preview()) : ?>
                <p class="site-description"><?php echo $description; ?></p>
            <?php endif; ?>
        </div>

        <nav class="main-nav">
            <?php
            wp_nav_menu(array(
                'theme_location' => 'primary',
                'menu_class'     => 'nav-menu',
                'container'      => false,
                'fallback_cb'    => 'darknet_fallback_menu',
            ));
            ?>
        </nav>
    </header>

    <div class="site-content">
        <main class="main-content">
