<?php
/**
 * Template for displaying a single Onion Link
 */
get_header();

while (have_posts()) : the_post();
    $onion_url = get_post_meta(get_the_ID(), '_onion_url', true);
    $status = get_post_meta(get_the_ID(), '_onion_status', true) ?: 'unknown';
    $mirrors = get_post_meta(get_the_ID(), '_onion_mirrors', true);
    $last_checked = get_post_meta(get_the_ID(), '_last_checked', true);
    $categories = get_the_terms(get_the_ID(), 'onion_category');
    $tags = get_the_terms(get_the_ID(), 'onion_tag');
?>

<article id="onion-<?php the_ID(); ?>" <?php post_class('onion-link-single'); ?>>
    <header class="entry-header">
        <h1 class="entry-title" style="margin-bottom: 0.5rem;">
            <?php the_title(); ?>
        </h1>

        <div class="entry-meta">
            <span class="onion-status <?php echo esc_attr($status); ?>" style="display: inline-block; margin-right: 1rem;">
                <?php echo esc_html(ucfirst($status)); ?>
            </span>
            <?php if ($categories && !is_wp_error($categories)) : ?>
                <span class="categories">
                    <?php
                    $cat_links = array();
                    foreach ($categories as $cat) {
                        $cat_links[] = '<a href="' . esc_url(get_term_link($cat)) . '">' . esc_html($cat->name) . '</a>';
                    }
                    echo implode(', ', $cat_links);
                    ?>
                </span>
            <?php endif; ?>
            <?php if ($last_checked) : ?>
                <span class="last-checked">Last verified: <?php echo esc_html($last_checked); ?></span>
            <?php endif; ?>
        </div>
    </header>

    <!-- Primary URL -->
    <?php if ($onion_url) : ?>
    <div class="onion-url-block" style="margin: 1.5rem 0;">
        <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem;">Primary URL</h3>
        <div class="onion-url" style="font-size: 1rem;">
            <a href="<?php echo esc_url($onion_url); ?>" rel="nofollow noopener" target="_blank">
                <?php echo esc_html($onion_url); ?>
            </a>
        </div>
    </div>
    <?php endif; ?>

    <!-- Mirror URLs -->
    <?php if ($mirrors) :
        $mirror_list = array_filter(explode("\n", $mirrors));
        if (!empty($mirror_list)) :
    ?>
    <div class="onion-mirrors-block" style="margin: 1.5rem 0;">
        <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem;">Mirror URLs</h3>
        <ul style="list-style: none;">
            <?php foreach ($mirror_list as $mirror) :
                $mirror = trim($mirror);
                if (!empty($mirror)) :
            ?>
            <li style="margin-bottom: 0.5rem;">
                <div class="onion-url">
                    <a href="<?php echo esc_url($mirror); ?>" rel="nofollow noopener">
                        <?php echo esc_html($mirror); ?>
                    </a>
                </div>
            </li>
            <?php
                endif;
            endforeach;
            ?>
        </ul>
    </div>
    <?php
        endif;
    endif;
    ?>

    <!-- Description -->
    <div class="entry-content">
        <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem;">Description</h3>
        <?php the_content(); ?>
    </div>

    <!-- Tags -->
    <?php if ($tags && !is_wp_error($tags)) : ?>
    <div class="onion-tags" style="margin-top: 1.5rem;">
        <span class="text-muted" style="margin-right: 0.5rem;">Tags:</span>
        <?php foreach ($tags as $tag) : ?>
            <a href="<?php echo esc_url(get_term_link($tag)); ?>" class="onion-tag">
                <?php echo esc_html($tag->name); ?>
            </a>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>

    <!-- Warning -->
    <div class="widget-warning" style="margin-top: 2rem;">
        <p style="margin: 0;">
            <strong>WARNING:</strong> Always verify .onion URLs through multiple trusted sources before visiting.
            This directory does not verify the legitimacy or safety of listed services.
            Access at your own risk. Use Tor Browser.
        </p>
    </div>

    <footer class="entry-footer" style="margin-top: 1.5rem;">
        <p class="text-muted" style="font-size: 0.8rem;">
            Added: <?php echo get_the_date('Y-m-d'); ?> ::
            Last modified: <?php echo get_the_modified_date('Y-m-d'); ?>
        </p>
    </footer>
</article>

<!-- Navigation -->
<nav class="post-navigation" style="margin: 2rem 0;">
    <div style="display: flex; justify-content: space-between; gap: 1rem;">
        <div class="nav-previous">
            <?php previous_post_link('%link', '&laquo; %title', false, '', 'onion_category'); ?>
        </div>
        <div class="nav-next">
            <?php next_post_link('%link', '%title &raquo;', false, '', 'onion_category'); ?>
        </div>
    </div>
</nav>

<div style="text-align: center; margin: 2rem 0;">
    <a href="<?php echo esc_url(get_post_type_archive_link('onion_link')); ?>" class="read-more">
        [ Back to Directory ]
    </a>
</div>

<?php endwhile; ?>

<?php get_footer(); ?>
