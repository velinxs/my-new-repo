<?php get_header(); ?>

<?php while (have_posts()) : the_post(); ?>

    <article id="page-<?php the_ID(); ?>" <?php post_class(); ?>>
        <header class="entry-header">
            <h1 class="entry-title"><?php the_title(); ?></h1>
        </header>

        <div class="entry-content">
            <?php the_content(); ?>

            <?php
            wp_link_pages(array(
                'before' => '<nav class="pagination">',
                'after'  => '</nav>',
            ));
            ?>
        </div>
    </article>

    <?php
    if (comments_open() || get_comments_number()) :
        comments_template();
    endif;
    ?>

<?php endwhile; ?>

<?php get_footer(); ?>
